export function portal(node: HTMLElement, target: HTMLElement = document.body) {
	target.appendChild(node);
	return {
		destroy() {
			// Remove only if it's still attached
			if (node.parentNode) node.parentNode.removeChild(node);
		}
	};
}
