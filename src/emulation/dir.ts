import type { Dirent as _Dirent, Dir as _Dir } from 'fs';
import type { NoArgCallback, TwoArgCallback } from '../filesystem.js';
import type { Stats } from '../stats.js';
import { readdir } from './promises.js';
import { ApiError, ErrorCode } from '../ApiError.js';
import { readdirSync } from './sync.js';

export class Dirent implements _Dirent {
	constructor(
		public name: string,
		protected stats: Stats
	) {}

	isFile(): boolean {
		return this.stats.isFile();
	}
	isDirectory(): boolean {
		return this.stats.isDirectory();
	}
	isBlockDevice(): boolean {
		return this.stats.isBlockDevice();
	}
	isCharacterDevice(): boolean {
		return this.stats.isCharacterDevice();
	}
	isSymbolicLink(): boolean {
		return this.stats.isSymbolicLink();
	}
	isFIFO(): boolean {
		return this.stats.isFIFO();
	}
	isSocket(): boolean {
		return this.stats.isSocket();
	}
}

/**
 * A class representing a directory stream.
 */
export class Dir implements _Dir {
	protected closed = false;

	protected checkClosed(): void {
		if (this.closed) {
			throw new ApiError(ErrorCode.EBADF, 'Can not use closed Dir');
		}
	}

	protected _entries: Dirent[];

	constructor(public readonly path: string) {}

	/**
	 * Asynchronously close the directory's underlying resource handle.
	 * Subsequent reads will result in errors.
	 */
	close(): Promise<void>;
	close(cb: NoArgCallback): void;
	close(cb?: NoArgCallback): void | Promise<void> {
		this.closed = true;
		if (!cb) {
			return Promise.resolve();
		}
		cb();
	}

	/**
	 * Synchronously close the directory's underlying resource handle.
	 * Subsequent reads will result in errors.
	 */
	closeSync(): void {
		this.closed = true;
	}

	protected async _read(): Promise<Dirent | null> {
		if (!this._entries) {
			this._entries = await readdir(this.path, { withFileTypes: true });
		}
		if (this._entries.length == 0) {
			return null;
		}
		return this._entries.shift();
	}

	/**
	 * Asynchronously read the next directory entry via `readdir(3)` as an `Dirent`.
	 * After the read is completed, a value is returned that will be resolved with an `Dirent`, or `null` if there are no more directory entries to read.
	 * Directory entries returned by this function are in no particular order as provided by the operating system's underlying directory mechanisms.
	 */
	read(): Promise<Dirent | null>;
	read(cb: TwoArgCallback<Dirent | null>): void;
	read(cb?: TwoArgCallback<Dirent | null>): void | Promise<Dirent | null> {
		if (!cb) {
			return this._read();
		}

		this._read().then(value => cb(null, value));
	}

	/**
	 * Synchronously read the next directory entry via `readdir(3)` as a `Dirent`.
	 * If there are no more directory entries to read, null will be returned.
	 * Directory entries returned by this function are in no particular order as provided by the operating system's underlying directory mechanisms.
	 */
	readSync(): Dirent | null {
		if (!this._entries) {
			this._entries = readdirSync(this.path, { withFileTypes: true });
		}
		if (this._entries.length == 0) {
			return null;
		}
		return this._entries.shift();
	}

	/**
	 * Asynchronously iterates over the directory via `readdir(3)` until all entries have been read.
	 */
	[Symbol.asyncIterator](): AsyncIterableIterator<Dirent> {
		const _this = this;

		return {
			[Symbol.asyncIterator]: this[Symbol.asyncIterator],
			async next(): Promise<IteratorResult<Dirent>> {
				const value = await _this._read();
				if (value != null) {
					return { done: false, value };
				}

				await _this.close();
				return { done: true, value: undefined };
			},
		};
	}
}
