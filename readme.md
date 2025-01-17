# ZenFS

ZenFS is a file system that emulates the [NodeJS filesystem API](http://nodejs.org/api/fs.html).

It works using a system of backends, which are used by ZenFS to store and retrieve data. ZenFS can also integrate with other tools.

ZenFS is a fork of [BrowserFS](https://github.com/jvilk/BrowserFS).

## Backends

ZenFS is modular and extensible. The core includes a few built-in backends:

-   `InMemory`: Stores files in-memory. This is cleared when the runtime ends (e.g. a user navigating away from a web page or a Node process exiting)
-   `Overlay`: Use read-only file system as read-write by overlaying a writable file system on top of it.
-   `AsyncMirror`: Use an asynchronous backend synchronously. This is very helpful for asynchronous backends

> [!NOTE]
> When constructed, `AsyncMirror` loads the entire contents of the async file system into a synchronous backend. It performs operations on the synchronous file system and then queues them to be mirrored onto the asynchronous backend.

ZenFS supports a number of other backends. Many are provided as seperate packages under `@zenfs`. More backends can be defined by separate libraries by extending the `FileSystem` class and/or providing a `Backend` object.

For more information, see the [docs](https://zen-fs.github.io/core).

## Installing

```sh
npm install @zenfs/core
```

## Usage

> [!NOTE]
> The examples are written in ESM.  
> If you are using CJS, you can `require` the package.  
> If using a browser environment without support for `type=module` in `script` tags, you can add a `script` tag to your HTML pointing to the `browser.min.js` and use ZenFS with the global `ZenFS` object.

```js
import fs from '@zenfs/core'; // You can also use the named export, `fs`

fs.writeFileSync('/test.txt', 'Cool, I can do this in any JS environment (including browsers)!');

const contents = fs.readFileSync('/test.txt', 'utf-8');
console.log(contents);
```

#### Using different and/or multiple backends

A single `InMemory` backend is created by default, mounted on `/`.

You can configure ZenFS to use a different backend and mount multiple backends. It is strongly recommended to do so using the `configure` function.

You can use multiple backends by passing an object to `configure` which maps paths to file systems.

The following example mounts a zip file to `/zip`, in-memory storage to `/tmp`, and IndexedDB to `/home`. Note that `/` has the default in-memory backend.

```js
import { configure, InMemory } from '@zenfs/core';
import { IndexedDB } from '@zenfs/dom';
import { Zip } from '@zenfs/zip';

const zipData = await (await fetch('mydata.zip')).arrayBuffer();

await configure({
	'/mnt/zip': { backend: Zip, zipData },
	'/tmp': InMemory,
	'/home': IndexedDB,
};
```

> [!TIP]
> When configuring a mount point, you can pass in
>
> 1. A `Backend` object, if the backend has no required options
> 2. An object that has the options accepted by the backend and a `backend` property which is a `Backend` object
> 3. A `FileSystem` instance (_not recommended_)

Here is an example that mounts the `Storage` backend from `@zenfs/dom` on `/`:

```js
import { configure, fs } from '@zenfs/core';
import { Storage } from '@zenfs/dom';

await configure({ backend: Storage });

if (!fs.existsSync('/test.txt')) {
	fs.writeFileSync('/test.txt', 'This will persist across reloads!');
}

const contents = fs.readFileSync('/test.txt', 'utf-8');
console.log(contents);
```

#### FS Promises

The FS promises API is exposed as `promises`.

```js
import { configure, promises } from '@zenfs/core';
import { IndexedDB } from '@zenfs/dom';

await configure({ '/': IndexedDB });

const exists = await promises.exists('/myfile.txt');
if (!exists) {
	await promises.write('/myfile.txt', 'Lots of persistant data');
}
```

> [!NOTE]
> You can import the promises API using `promises`, or using `fs.promises` on the exported `fs`.

> [!IMPORTANT]
> ZenFS does _not_ provide a seperate public import for importing promises like `fs/promises`. If you are using ESM, you can import promises functions like `fs/promises` from the `dist/emulation/promises.ts` file, though this may change at any time and is **not recommended**.

#### Using asynchronous backends synchronously

You may have noticed that attempting to use a synchronous function on an asynchronous backend (e.g. `IndexedDB`) results in a "not supplied" error (`ENOTSUP`). If you would like to use an asynchronous backend synchronously you need to wrap it in an `AsyncMirror`:

```js
import { configure, fs, AsyncMirror, InMemory } from '@zenfs/core';
import { IndexedDB } from '@zenfs/dom';

await configure({
	'/': {
		backend: AsyncMirror,
		sync: InMemory,
		async: IndexedDB,
	},
});

fs.writeFileSync('/persistant.txt', 'My persistant data');
```

#### Mounting and unmounting, creating backends

If you would like to create backends without configure (e.g. to do something dynamic at runtime), you may do so by importing the backend and calling `createBackend` with it.

You can then mount and unmount the backend instance by using `mount` and `umount`.

```js
import { configure, createBackend, InMemory } from '@zenfs/core';
import { IndexedDB  } from '@zenfs/dom';
import { Zip } from '@zenfs/zip';

await configure({
	'/tmp': InMemory,
	'/home': IndexedDB,
};

fs.mkdirSync('/mnt');

const res = await fetch('mydata.zip');
const zipFs = await createBackend(Zip, { zipData: await res.arrayBuffer() });
fs.mount('/mnt/zip', zipFs);

// do stuff with the mounted zip

fs.umount('/mnt/zip'); // finished using the zip
```

> [!WARNING]
> Instances of backends follow the **internal** ZenFS API. You should never use a backend's methods unless you are extending a backend.

## Using with bundlers

ZenFS exports a drop-in for Node's `fs` module (up to the version of `@types/node` in package.json), so you can use it for your bundler of preference using the default export.

## Building

-   Make sure you have Node and NPM installed. You must have Node v18 or newer.
-   Install dependencies with `npm install`
-   Build using `npm run build`
-   You can find the built code in `dist`.

### Testing

Run unit tests with `npm test`.
