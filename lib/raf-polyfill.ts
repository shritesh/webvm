

// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// requestAnimationFrame polyfill by Erik Möller
// fixes from Paul Irish and Tino Zijdel

const now = (function() {
  return performance.now    ||
    // @ts-ignore
    performance.mozNow    ||
    // @ts-ignore
    performance.msNow     ||
    // @ts-ignore
    performance.oNow      ||
    // @ts-ignore
    performance.webkitNow ||
    Date.now;
})();
	
const frameRate = 1000/60;
const vendors = ['ms', 'moz', 'webkit', 'o'];

// Handler expresses what we expect as a callback to request animation frame;
export interface Handler {
  (ms: number): void;
}

// RAF exposes a interface for DOM request animation frame.
export interface RAF {
   requestAnimationFrame(callback: Handler, element: any): number;
   cancelAnimationFrame(id: number): void;
}

export function GetRAF(): RAF {
  let lastTime = 0;
  
  const mod: any = {};
  
  for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    mod.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
    mod.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame']
      || window[vendors[x]+'RequestCancelAnimationFrame'];
  }
  
  if (!mod.requestAnimationFrame || !mod.cancelAnimationFrame) //current Chrome (16) supports request but not cancel
    mod.requestAnimationFrame = function(callback: Handler, element: any): number {
      const currTime = now();
      const timeToCall = Math.max(0, frameRate - (currTime - lastTime));
      const id = window.setTimeout(function() {
        try {
          callback(currTime + timeToCall);
        }catch(e){
          console.log("Error: ", e);
          setTimeout(function () {
            throw e;
          }, 0);
        }
      }, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  
  if (!window.cancelAnimationFrame) {
    mod.cancelAnimationFrame = function(id: number): void {
      clearTimeout(id);
    };
  }
  
  return mod as RAF;
}

