export interface FrameRequestCallback {
	(time: number): void;
}

export const raf = window.requestAnimationFrame
	|| window.webkitRequestAnimationFrame
	|| function(cb: FrameRequestCallback) { return setTimeout(cb, 16); };

class AnimationQueue {
	private readonly frames: Array<AFrame>;
	
	constructor(){
		this.frames = new Array<AFrame>();
	}
	
	new(): AFrame{
		const newFrame = new AFrame(this.frames.length, this);
		this.frames.push(newFrame);
		return newFrame;
	}
	
	remove(f: AFrame) {
		if (this.frames.length == 0) {
			return null;
		}
		
		const total = this.frames.length;
		if(total == 1){
			this.frames.pop();
			return null;
		}
		
		this.frames[f.queueIndex] = this.frames[total -1];
		this.frames.length = total - 1;
	}
}

class AFrame {
	public queueIndex: number;
	private skip: boolean;
	private queue: AnimationQueue;
	private callbacks: Array<FrameRequestCallback>;
	
	constructor(index: number, queue: AnimationQueue){
		this.skip = false;
		this.queue = queue;
		this.queueIndex = index;
		this.callbacks = new Array<FrameRequestCallback>();
	}
	
	// Add adds new callback into giving frame callback group.
	add(callback: FrameRequestCallback){
		this.callbacks.push(callback);
	}
	
	// Clear clears all items from underline callback.
	clear(){
		this.callbacks.length = 0;
	}
	
	pause(){
		this.skip = true;
	}
	
	stop(){
		this.pause();
		this.queue.remove(this);
	}
	
	animate(ts: number){
		for(let index in this.callbacks){
			const callback = this.callbacks[index];
			callback(ts);
		}
	}
}



