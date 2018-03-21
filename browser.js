// tooling
const postcss = require('postcss');
const postcssDir = require('postcss-dir-pseudo-class');
const postcssLogical = require('postcss-logical');
const postcssNesting = require('postcss-nesting');

// cache
const cache = {};

// parse <style> after running its contents through a PostCSS plugin
function updateStyle($style) {
	if ($style instanceof Element) {
		cache.textContent = $style.textContent;
		cache.className = $style.className;
	}

	return postcss([
		postcssLogical(),
		postcssNesting(),
		postcssDir()
	]).process(cache.textContent, {
		from: cache.className
	}).then(
		result => postcss().process(result.css, {
			from: cache.className
		})
	).then(
		result => {
			$style.textContent = result.css;
		},
		console.error
	);
}

// update any pre-existing <style> in <head> using the PostCSS plugin
const $styles = document.head.getElementsByTagName('style');

if ($styles.length) {
	Array.prototype.filter.call($styles, node => node.nodeName === 'STYLE' && node.className === 'cp-pen-styles')
	.concat($styles[0])
	.slice(0, 1)
	.forEach(updateStyle);
}

// watch for and update any new <style> in <head> using the PostCSS plugin
(new MutationObserver(
	mutations => mutations.forEach(
		mutation => Array.prototype.filter.call(
			mutation.addedNodes || [],
			node => node.nodeName === 'STYLE' && node.className === 'cp-pen-styles'
		).forEach(updateStyle)
	)
)).observe(document.head, { childList: true });
