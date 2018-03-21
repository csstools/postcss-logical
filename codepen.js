// tooling
const postcss = require('postcss');
const postcssDir = require('postcss-dir-pseudo-class');
const postcssLogical = require('postcss-logical');
const postcssNesting = require('postcss-nesting');

// fragment
const $fragment = document.createDocumentFragment();

// dir control
const $dir = $fragment.appendChild(document.createElement('select')); $dir.setAttribute('aria-label', 'dir option'); $dir.className = 'option-stage';

[false, 'ltr', 'rtl'].forEach(option => {
	const optionValue = typeof option === 'string' ? `"${option}"` : option
	const $option = $dir.appendChild(document.createElement('option')); $option.value = optionValue;

	$option.appendChild(document.createTextNode(`Option { dir: ${optionValue} }`));
}); $dir.value = false;

$dir.addEventListener('change', updateStyle);

// preserve control
const $preserve = $fragment.appendChild(document.createElement('select')); $preserve.setAttribute('aria-label', 'preserve option'); $preserve.className = 'option-stage';

[false, true].forEach(option => {
	const optionValue = typeof option === 'string' ? `"${option}"` : option
	const $option = $preserve.appendChild(document.createElement('option')); $option.value = optionValue;

	$option.appendChild(document.createTextNode(`Option { preserve: ${optionValue} }`));
}); $preserve.value = false;

$preserve.addEventListener('change', updateStyle);

// result preformatted container
const $result = $fragment.appendChild(document.createElement('pre')); $result.className = 'css-root';

// cache
const cache = {};

// parse <style> after running its contents through a PostCSS plugin
function updateStyle($style) {
	if ($style instanceof Element) {
		cache.textContent = $style.textContent;
		cache.className = $style.className;
	}

	try {
		cache.options = {
			dir: JSON.parse($dir.value),
			preserve: JSON.parse($preserve.value)
		};
	} catch (error) {
		console.error(error);

		cache.options = {};
	}

	return postcss([
		postcssLogical(cache.options),
		postcssNesting(),
		postcssDir()
	]).process(cache.textContent, {
		from: cache.className
	}).then(
		result => postcss().process(result.css.trim(), {
			from: cache.className,
			stringifier: postcssToSyntaxHTML
		})
	).then(
		result => {
			if ($style instanceof Element && $style.parentNode) {
				$style.parentNode.removeChild($style);
			}

			if (result.css !== cache.css) {
				$result.innerHTML = cache.css = result.css;
			}
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

// on document ready
document.addEventListener('DOMContentLoaded', () => {
	document.body.appendChild($fragment);
});

// format css as syntax-highlighted HTML
function postcssToSyntaxHTML(root, builder) {
	function toString(node, semicolon) {
		if ('atrule' === node.type) {
			return atruleToString(node, semicolon);
		} if ('rule' === node.type) {
			return ruleToString(node, semicolon);
		} else if ('decl' === node.type) {
			return declToString(node, semicolon);
		} else if ('comment' === node.type) {
			return commentToString(node, semicolon);
		} else {
			return node.nodes ? node.nodes.map(childNodes => toString(childNodes, semicolon)).join('') : node.toString();
		}
	}

	function atruleToString(atrule, semicolon) {
		return `${atrule.raws.before||''}<span class=css-atrule><span class=css-atrule-name>@${atrule.name}</span>${atrule.raws.afterName||''}<span class=css-atrule-params>${atrule.params}</span>${atrule.raws.between||''}${atrule.nodes?`<span class=css-block>{${atrule.nodes.map(node => toString(node, atrule.raws.semicolon)).join('')}${atrule.raws.after||''}}</span>`:semicolon?';':''}</span>`;
	}

	function ruleToString(rule) {
		return `${rule.raws.before||''}<span class=css-rule><span class=css-selector>${rule.selector}</span>${rule.raws.between||''}<span class=css-block>{${rule.nodes.map(node => toString(node, rule.raws.semicolon)).join('')}${rule.raws.after||''}}</span></span>`;
	}

	function declToString(decl, semicolon) {
		return `${decl.raws.before || ''}<span class=css-declaration><span class=css-property>${decl.prop}</span>${decl.raws.between || ':'}<span class=css-value>${decl.value}</span>${semicolon?';':''}</span>`;
	}

	function commentToString(comment) {
		return `${comment.raws.before}<span class=css-comment>/*${comment.raws.left}${comment.text}${comment.raws.right}*/</span>`;
	}

	builder(
		toString(root)
	);
}
