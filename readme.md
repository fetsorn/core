# BrowserFS

BrowserFS is an in-browser file system that emulates the [Node JS file system API](http://nodejs.org/api/fs.html) and supports storing and retrieving files from various backends. BrowserFS also integrates nicely with other tools.

## Backends

BrowserFS is highly extensible, and includes many builtin filesystem backends:

-   `InMemory`: Stores files in-memory. It is a temporary file store that clears when the user navigates away.
-   `Overlay`: Mount a read-only file system as read-write by overlaying a writable file system on top of it. Like Docker's overlayfs, it will only write changed files to the writable file system.
-   `AsyncMirror`: Use an asynchronous backend synchronously. Invaluable for Emscripten; let your Emscripten applications write to larger file stores with no additional effort!
    -   `AsyncMirror` loads the entire contents of the async file system into a synchronous backend during construction. It performs operations synchronous file system and then queues them to be mirrored onto the asynchronous backend.

More backends can be defined by separate libraries, so long as they extend they implement `BrowserFS.FileSystem`. Multiple backends can be active at once at different locations in the directory hierarchy.

BrowserFS supports a number of other backends (many are provided as seperate packages under `@browserfs`).

For more information, see the [API documentation for BrowserFS](https://browser-fs.github.io/core).

## Installing

```sh
npm install @browserfs/core
```

## Usage

> 🛈 The examples are written in ESM. If you are using CJS, you can `require` the package. If running in a browser you can add a script tag to your HTML pointing to the `browser.min.js` and use BrowserFS via the global `BrowserFS` object.

```js
import fs from '@browserfs/core';

fs.writeFileSync('/test.txt', 'Cool, I can do this in the browser!');

const contents = fs.readFileSync('/test.txt', 'utf-8');
console.log(contents);
```

#### Using different backends

A `InMemory` backend is created by default. If you would like to use a different one, you must configure BrowserFS. It is recommended to do so using the `configure` function. Here is an example using the `Storage` backend from `@browserfs/fs-dom`:

```js
import { configure, fs } from '@browserfs/core';
import { StorageStore } from '@browserfs/fs-dom';

await configure({ backend: StorageStore });

if (!fs.existsSync('/test.txt')) {
	fs.writeFileSync('/test.txt', 'This will persist across reloads!');
}

const contents = fs.readFileSync('/test.txt', 'utf-8');
console.log(contents);
```

#### Using multiple backends

You can use multiple backends by passing an object to `configure` which maps paths to file systems. The following example mounts a zip file to `/zip`, in-memory storage to `/tmp`, and IndexedDB storage to `/home` (note that `/` has the default in-memory backend):

```js
import { configure } from '@browserfs/core';
import { IndexedDB } from '@browserfs/fs-dom';
import { Zip } from '@browserfs/fs-zip';

const zipData = await (await fetch('mydata.zip')).arrayBuffer();

await configure({
	'/mnt/zip': {
		backend: Zip,
		zipData: zipData,
	},
	'/tmp': 'InMemory',
	'/home': IndexedDB,
};
```

#### FS Promises API

The FS promises API is exposed as `promises`.

```js
import { configure, promises } from '@browserfs/core';
import { IndexedDB } from '@browserfs/fs-dom';

await configure({ '/': IndexedDB });

const exists = await promises.exists('/myfile.txt');
if (!exists) {
	await promises.write('/myfile.txt', 'Lots of persistant data');
}
```

BrowserFS does _not_ provide a seperate public import for importing promises in its built form. If you are using ESM, you can import promises functions from `dist/emulation/promises`, though this may change at any time and is not recommended.

#### Using asynchronous backends synchronously

You may have noticed that attempting to use a synchronous function on an asynchronous backend (e.g. IndexedDB) results in a "not supplied" error (`ENOTSUP`). If you wish to use an asynchronous backend synchronously you need to wrap it in an `AsyncMirror`:

```js
import { configure, fs } from '@browserfs/core';
import { IndexedDB } from '@browserfs/fs-dom';

await configure({
	'/': {
		backend: 'AsyncMirror',
		sync: 'InMemory',
		async: IndexedDB,
	},
});

fs.writeFileSync('/persistant.txt', 'My persistant data'); // This fails if you configure with only IndexedDB
```

### Advanced usage

#### Creating backends

If you would like to create backends without configure, you may do so by importing the backend and calling `createBackend` with it. You can import the backend directly or with `backends`:

```js
import { configure, backends, InMemory } from '@browserfs/core';

console.log(backends.InMemory === InMemory); // they are the same

const internalInMemoryFS = await createBackend(InMemory);
```

> ⚠ Instances of backends follow the **_internal_** BrowserFS API. You should never use a backend's methods unless you are extending a backend.

```js
import { configure, InMemory } from '@browserfs/core';

const internalInMemoryFS = new InMemory();
await internalInMemoryFS.ready();
```

#### Mounting

If you would like to mount and unmount backends, you can do so using the `mount` and `umount` functions:

```js
import { fs, InMemory } from '@browserfs/core';

const internalInMemoryFS = await createBackend(InMemory); // create an FS instance

fs.mount('/tmp', internalInMemoryFS); // mount

fs.umount('/tmp'); // unmount /tmp
```

This could be used in the "multiple backends" example like so:

```js
import { IndexedDB  } from '@browserfs/fs-dom';
import { Zip } from '@browserfs/fs-zip';

await configure({
	'/tmp': 'InMemory',
	'/home': 'IndexedDB',
};

fs.mkdirSync('/mnt');

const res = await fetch('mydata.zip');
const zipFs = await createBackend(Zip, { zipData: await res.arrayBuffer() });
fs.mount('/mnt/zip', zipFs);

// do stuff with the mounted zip

fs.umount('/mnt/zip'); // finished using the zip
```

## Using with bundlers

BrowserFS exports a drop-in for Node's `fs` module (up to the version of `@types/node` in package.json), so you can use it for your bundler of preference using the default export.

## Building

-   Make sure you have Node and NPM installed. You must have Node v18 or newer.
-   Install dependencies with `npm install`
-   Build using `npm run build`
-   You can find the built code in `dist`.

### Testing

Run unit tests with `npm test`.

### License

BrowserFS is licensed under the MIT License.