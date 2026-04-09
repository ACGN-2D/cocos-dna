/**
 * DebugLogger — 结构化调试日志系统
 * [cocos-dna skill template — v1.0.0]
 *
 * 功能：
 *  - 带时间戳、模块标签、级别的结构化日志
 *  - 日志同时写入 console 和 window.__DEBUG_LOG__ 数组
 *  - E2E 测试通过 window.__DEBUG_LOG__ 读取结构化数据做断言
 *  - 支持运行时开/关，生产环境可完全关闭（零性能开销）
 *  - 支持按模块过滤
 *
 * 用法：
 *   import { DebugLogger } from '../runtime/core/DebugLogger';
 *   const log = DebugLogger.create('BattleManager');
 *   log.info('battle_start', { playerHp: 72, enemies: ['gear_spider'] });
 *   log.warn('low_energy', { energy: 0 });
 *   log.error('invalid_card', { handIndex: -1 });
 *
 * E2E 读取：
 *   const logs = await page.evaluate(() => window.__DEBUG_LOG__);
 *   const battleLogs = logs.filter(l => l.module === 'BattleManager' && l.tag === 'battle_start');
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    OFF = 99,
}

export interface IDebugLogEntry {
    /** 时间戳 (ms，相对于启动时间) */
    ts: number;
    /** 模块名称 (如 'BattleManager', 'DeckManager') */
    module: string;
    /** 日志标签/事件名 (如 'battle_start', 'card_played') */
    tag: string;
    /** 日志级别 */
    level: 'debug' | 'info' | 'warn' | 'error';
    /** 结构化数据负载 */
    data: Record<string, any>;
}

/** 全局配置 */
interface ILoggerConfig {
    /** 是否启用（false 时所有日志操作为空操作，零开销） */
    enabled: boolean;
    /** 最低输出级别 */
    minLevel: LogLevel;
    /** 是否同时输出到 console */
    consoleOutput: boolean;
    /** 日志缓冲区最大条数（防止内存泄漏） */
    maxEntries: number;
    /** 按模块过滤（空数组 = 全部输出） */
    moduleFilter: string[];
}

// 声明全局变量类型
declare global {
    interface Window {
        __DEBUG_LOG__: IDebugLogEntry[];
        __DEBUG_LOGGER_CONFIG__: ILoggerConfig;
    }
}

class DebugLoggerCore {
    private static _instance: DebugLoggerCore | null = null;
    private _startTime: number = Date.now();
    private _config: ILoggerConfig;

    private constructor() {
        this._config = {
            enabled: true,
            minLevel: LogLevel.DEBUG,
            consoleOutput: true,
            maxEntries: 2000,
            moduleFilter: [],
        };

        // 初始化全局日志缓冲区
        if (typeof window !== 'undefined') {
            if (!window.__DEBUG_LOG__) {
                window.__DEBUG_LOG__ = [];
            }
            // 允许外部通过 window.__DEBUG_LOGGER_CONFIG__ 预设配置
            if (window.__DEBUG_LOGGER_CONFIG__) {
                Object.assign(this._config, window.__DEBUG_LOGGER_CONFIG__);
            }
        }
    }

    public static get instance(): DebugLoggerCore {
        if (!DebugLoggerCore._instance) {
            DebugLoggerCore._instance = new DebugLoggerCore();
        }
        return DebugLoggerCore._instance;
    }

    /** 重置单例（仅用于测试） */
    public static resetInstance(): void {
        if (DebugLoggerCore._instance) {
            DebugLoggerCore._instance.clear();
            DebugLoggerCore._instance = null;
        }
    }

    // ===== 配置管理 =====

    /** 启用/禁用日志（生产环境设为 false） */
    public setEnabled(enabled: boolean): void {
        this._config.enabled = enabled;
    }

    /** 设置最低输出级别 */
    public setMinLevel(level: LogLevel): void {
        this._config.minLevel = level;
    }

    /** 设置是否输出到 console */
    public setConsoleOutput(enabled: boolean): void {
        this._config.consoleOutput = enabled;
    }

    /** 设置模块过滤（空数组 = 全部） */
    public setModuleFilter(modules: string[]): void {
        this._config.moduleFilter = modules;
    }

    /** 获取当前配置（只读） */
    public get config(): Readonly<ILoggerConfig> {
        return this._config;
    }

    /** 清空日志缓冲区 */
    public clear(): void {
        if (typeof window !== 'undefined') {
            window.__DEBUG_LOG__ = [];
        }
    }

    /** 获取所有日志（供非浏览器环境使用） */
    public getLogs(): IDebugLogEntry[] {
        if (typeof window !== 'undefined') {
            return window.__DEBUG_LOG__ || [];
        }
        return [];
    }

    /** 按条件过滤日志 */
    public query(filter: {
        module?: string;
        tag?: string;
        level?: string;
        since?: number;
    }): IDebugLogEntry[] {
        const logs = this.getLogs();
        return logs.filter(entry => {
            if (filter.module && entry.module !== filter.module) return false;
            if (filter.tag && entry.tag !== filter.tag) return false;
            if (filter.level && entry.level !== filter.level) return false;
            if (filter.since !== undefined && entry.ts < filter.since) return false;
            return true;
        });
    }

    // ===== 日志写入 =====

    public log(module: string, tag: string, level: LogLevel, data: Record<string, any>): void {
        // 快速路径：未启用时直接返回
        if (!this._config.enabled) return;
        if (level < this._config.minLevel) return;

        // 模块过滤
        if (this._config.moduleFilter.length > 0 &&
            !this._config.moduleFilter.includes(module)) {
            return;
        }

        const levelStr = this._levelToString(level);
        const entry: IDebugLogEntry = {
            ts: Date.now() - this._startTime,
            module,
            tag,
            level: levelStr,
            data,
        };

        // 写入全局缓冲区
        if (typeof window !== 'undefined') {
            if (!window.__DEBUG_LOG__) window.__DEBUG_LOG__ = [];
            window.__DEBUG_LOG__.push(entry);

            // 超出上限时裁剪前半部分
            if (window.__DEBUG_LOG__.length > this._config.maxEntries) {
                window.__DEBUG_LOG__ = window.__DEBUG_LOG__.slice(
                    Math.floor(this._config.maxEntries / 2)
                );
            }
        }

        // 输出到 console
        if (this._config.consoleOutput) {
            const prefix = `[${module}] ${tag}`;
            const consoleFn = level >= LogLevel.ERROR ? console.error
                : level >= LogLevel.WARN ? console.warn
                    : console.log;
            consoleFn(prefix, data);
        }
    }

    private _levelToString(level: LogLevel): 'debug' | 'info' | 'warn' | 'error' {
        switch (level) {
            case LogLevel.DEBUG: return 'debug';
            case LogLevel.INFO: return 'info';
            case LogLevel.WARN: return 'warn';
            case LogLevel.ERROR: return 'error';
            default: return 'info';
        }
    }
}

/**
 * 模块级 Logger 实例（轻量句柄）
 *
 * 用法：
 *   const log = DebugLogger.create('BattleManager');
 *   log.info('battle_start', { ... });
 */
export class DebugLogger {
    private _module: string;

    private constructor(module: string) {
        this._module = module;
    }

    /** 创建指定模块的 Logger */
    public static create(module: string): DebugLogger {
        return new DebugLogger(module);
    }

    // ===== 静态配置方法 =====

    /** 全局启用/禁用 */
    public static setEnabled(enabled: boolean): void {
        DebugLoggerCore.instance.setEnabled(enabled);
    }

    /** 全局设置最低级别 */
    public static setMinLevel(level: LogLevel): void {
        DebugLoggerCore.instance.setMinLevel(level);
    }

    /** 全局设置 console 输出 */
    public static setConsoleOutput(enabled: boolean): void {
        DebugLoggerCore.instance.setConsoleOutput(enabled);
    }

    /** 全局设置模块过滤 */
    public static setModuleFilter(modules: string[]): void {
        DebugLoggerCore.instance.setModuleFilter(modules);
    }

    /** 清空所有日志 */
    public static clear(): void {
        DebugLoggerCore.instance.clear();
    }

    /** 获取所有日志 */
    public static getLogs(): IDebugLogEntry[] {
        return DebugLoggerCore.instance.getLogs();
    }

    /** 按条件查询日志 */
    public static query(filter: {
        module?: string;
        tag?: string;
        level?: string;
        since?: number;
    }): IDebugLogEntry[] {
        return DebugLoggerCore.instance.query(filter);
    }

    /** 重置（仅用于测试） */
    public static resetInstance(): void {
        DebugLoggerCore.resetInstance();
    }

    // ===== 实例日志方法 =====

    public debug(tag: string, data: Record<string, any> = {}): void {
        DebugLoggerCore.instance.log(this._module, tag, LogLevel.DEBUG, data);
    }

    public info(tag: string, data: Record<string, any> = {}): void {
        DebugLoggerCore.instance.log(this._module, tag, LogLevel.INFO, data);
    }

    public warn(tag: string, data: Record<string, any> = {}): void {
        DebugLoggerCore.instance.log(this._module, tag, LogLevel.WARN, data);
    }

    public error(tag: string, data: Record<string, any> = {}): void {
        DebugLoggerCore.instance.log(this._module, tag, LogLevel.ERROR, data);
    }
}
