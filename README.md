WebVM 
-------

*WebVM is still under heavy development but it is close to release with some changes still needed!*

WebVM is a project geared towards providing a DOM interaction layer between different 
projects built either in WebAssembly, Zig, Golang or Rust. Interacting with the DOM is at times 
not as performant or somewhat impossible due to the nature of whatever language being used.

I think by creating a simple interface library like this, developers can add whatever features 
and methods desired using WebVM, which allows them to have a consistent means of interacting both 
with DOM nodes, diffing and event management.

WebVM goal is to be the sit in library that any project can include for this purpose, I plan to ensure
it provides the following:

- Efficient DOM diffing using html strings and JSON.
- Easy interaction with RequestAnimationFrame for event loops.
- Simple Event management using live events.

## Building

To build WebVM typescript sources into javscript using the `commonjs` module system, simply
execute:

```bash
npm run ts-build
```

WebVM provides two commands with npm script that will use `browserify` to create a single bundle file suitable for use
in a browser, using any of the two commands will allow you dropped said file into the web-browser with a `<script>` tag.

```bash
"dist-unminified": "npx browserify --debug src/webvm.js -o dist/webvm.js",
"dist-minified": "npx browserify -p tinyify ./src/webvm.js -o ./dist/webvm.min.js",
```

Simply run the desired command to build and you will find built script in the `./dist` directory.

```bash
npm run dist-unminified
```

Or

```bash
npm run dist-minified
```

## Structure

All typescript work is being done in the [lib](./lib) directory, which then have their equivalent javascript versions
compiled into the [src](./src) directory. This allows anyone to pickup these files individually as they see fit. 

With the build scripts, a single version can be generated into the [dist](./dist) directly for the browser.