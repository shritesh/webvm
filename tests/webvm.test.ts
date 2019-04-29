import * as mount from '../lib/mount';

describe("WebVM unit tests", function () {
	it("Should be able to create a DOMMount for a dom node", function () {
		
		// Set up our document body
		document.body.innerHTML = "<div id='app'></div>";
		
		const app = document.querySelector('div#app');
		const mounted = new mount.DOMMount(document, '#app', function(event: Event, target: Element) {
		
		});
		
		
		expect(mounted).toBeDefined();
		expect(mounted.doc).toBeDefined();
		expect(mounted.doc).toBe(document);
		
		expect(mounted.mountNode).toBeDefined();
		expect(mounted.mountNode).toBe(app);
		
		const newContent = `
			<div id="rack-table">
				<div id="rack-item-1">
						<span>Wrecker</span>
				</div>
				<div id="rack-item-2">
						<span>Wrecker</span>
				</div>
				<div id="rack-item-3">
						<span>Wrecker</span>
				</div>
				<div id="rack-item-4">
						<span>Wrecker</span>
				</div>
			</div>
		`;
		
		mounted.patch(newContent);
		expect(mounted.mountNode.innerHTML).toBe(newContent);
	});
});