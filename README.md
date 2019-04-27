WebVM 
-------

*WebVM is still under heavy development but it is close to release with some changes still needed!*

WebVM is a project geared towards providing a DOM interaction layer between different 
projects built either in WebAssembly, Zig, Golang or Rust. 
Interacting with the DOM directly within such languages is either costly or not as efficient as directly using javascript
which the browser is built on. By providing an interface library which can sit in between your code and the browser, you can
get a well defined set of objects and methods that allow easy use of different DOM objects and behaviours.

I believe by having a simple interface library which can be dropped into any page, developers get the extra capability
to extend and add more objects that wrap behaviours or capabilities for easier access and use in their respective languages. 

WebVM goal is to be the sit in library that any project can include for the following purposes:

- Efficient DOM diffing methods.
- RequestAnimationFrame Loop management.
- Dead Simple Event using live events.
- DOMMount objects (Manages DOM Node update and patching) 
- Promise Polyfills
- Fetch Polyfills
- HTTP Methods

*An important things is WebVM exists to allow you easily take what already exists and extend it further 
for your personal use.*

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