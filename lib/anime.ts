export interface FrameRequestCallback {
	(time: number): void;
}

// AnimationQueue provides a queuing mechanism to create sectioned animations where
// one queue represent a set of an animation sequence or frames. This frames have no
// correlation with a Frame in animation but rather the idea of a frame of callbacks
// that may be connected together, basically a callback set. The idea is the queue
// sits on top of RequestAnimationFrame sequencing a set of Frames who control a set
// of callbacks.
//
// Start AnimationQueue.bind/AnimationQueue.unbind.
//
export class AnimationQueue {
	private readonly frames: Array<AFrame>;
	private skip: boolean;
	private binded: boolean;
	private requestAnimationID:number;
	
	constructor(){
		this.skip = false;
		this.binded = false;
		this.requestAnimationID = -1;
		this.frames = new Array<AFrame>();
	}
	
	// new returns a new Frame from queue.
	new(): AFrame{
		const newFrame = new AFrame(this.frames.length, this);
		this.frames.push(newFrame);
		return newFrame;
	}
	
	// Add adds provided frame into queue.
	add(f: AFrame) {
		f.queueIndex = this.frames.length;
		this.frames.push(f);
	}
	
	resume(){
		this.skip = false;
	}
	
	pause(){
		this.skip = true;
	}
	
	// unbind unbinds the giving queue from request animation frame.
	unbind(){
		if (!this.binded){
			return null;
		}
		
		window.cancelAnimationFrame(this.requestAnimationID);
	}
	
	bind(){
		if (this.binded) return null;
		const bindCycle = this.cycle.bind(this);
		this.requestAnimationID = window.requestAnimationFrame(bindCycle);
		this.binded = true;
	}
	
	cycle(ms: number){
		if (this.frames.length === 0){
			this.binded = false;
			return;
		}
		
		// animate all frames connected with this queue.
		this.frames.forEach(function (f: AFrame) {
			if (!f.paused()){
				f.animate(ms);
			}
		});
		
		this.bind();
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

// AFrame provides sets of callbacks sets which will be executed at the same time
// by the underline queue.
export class AFrame {
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
	
	// Paused returns true/false if giving frame is paused.
	paused(): boolean{
		return this.skip;
	}
	
	// Pause pauses giving frame.
	pause(){
		this.skip = true;
	}
	
	// stop removes giving frame from it's underline queue.
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



