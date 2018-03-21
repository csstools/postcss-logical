'use strict';

import postcss from 'postcss';

export default (decl, dir) => {
	let node = decl.parent;

	while (node && 'rule' !== node.type) {
		node = node.parent;
	}

	if (node) {
		node = node.clone({
			raws: {}
		}).removeAll()
	} else {
		node = postcss.rule();
	}

	node.selector = `&:dir(${dir})`;

	return node;
};
