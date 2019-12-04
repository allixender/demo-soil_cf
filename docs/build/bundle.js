
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            $$.fragment && $$.fragment.p($$.ctx, $$.dirty);
            $$.dirty = [-1];
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src\App.svelte generated by Svelte v3.16.0 */

    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (136:12) {#if soiltypequery_error.length > 0}
    function create_if_block_3(ctx) {
    	let small;
    	let t;

    	const block = {
    		c: function create() {
    			small = element("small");
    			t = text(/*soiltypequery_error*/ ctx[4]);
    			attr_dev(small, "id", "SoilTypeHelp");
    			attr_dev(small, "class", "form-text");
    			set_style(small, "color", "red");
    			add_location(small, file, 136, 14, 3437);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, small, anchor);
    			append_dev(small, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*soiltypequery_error*/ 16) set_data_dev(t, /*soiltypequery_error*/ ctx[4]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(small);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(136:12) {#if soiltypequery_error.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (144:12) {#if soiltype_loading}
    function create_if_block_2(ctx) {
    	let div;
    	let span;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			span.textContent = "Querying...";
    			attr_dev(span, "class", "sr-only");
    			add_location(span, file, 145, 14, 3790);
    			attr_dev(div, "class", "spinner-border");
    			attr_dev(div, "role", "status");
    			add_location(div, file, 144, 12, 3733);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(144:12) {#if soiltype_loading}",
    		ctx
    	});

    	return block;
    }

    // (155:12) {#each soiltypequery_result as elem}
    function create_each_block_1(ctx) {
    	let li;
    	let t0_value = /*elem*/ ctx[12].name + "";
    	let t0;
    	let t1;
    	let t2_value = /*elem*/ ctx[12].value + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			attr_dev(li, "class", "list-group-item");
    			add_location(li, file, 155, 14, 4105);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*soiltypequery_result*/ 64 && t0_value !== (t0_value = /*elem*/ ctx[12].name + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*soiltypequery_result*/ 64 && t2_value !== (t2_value = /*elem*/ ctx[12].value + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(155:12) {#each soiltypequery_result as elem}",
    		ctx
    	});

    	return block;
    }

    // (175:10) {#if texturequery_error.length > 0}
    function create_if_block_1(ctx) {
    	let small;
    	let t;

    	const block = {
    		c: function create() {
    			small = element("small");
    			t = text(/*texturequery_error*/ ctx[5]);
    			attr_dev(small, "id", "TextureQueryHelp");
    			attr_dev(small, "class", "form-text");
    			set_style(small, "color", "red");
    			add_location(small, file, 175, 12, 4621);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, small, anchor);
    			append_dev(small, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*texturequery_error*/ 32) set_data_dev(t, /*texturequery_error*/ ctx[5]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(small);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(175:10) {#if texturequery_error.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (183:12) {#if texture_loading}
    function create_if_block(ctx) {
    	let div;
    	let span;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			span.textContent = "Querying...";
    			attr_dev(span, "class", "sr-only");
    			add_location(span, file, 184, 14, 4953);
    			attr_dev(div, "class", "spinner-border");
    			attr_dev(div, "role", "status");
    			add_location(div, file, 183, 12, 4896);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(183:12) {#if texture_loading}",
    		ctx
    	});

    	return block;
    }

    // (194:12) {#each texturequery_result as elem}
    function create_each_block(ctx) {
    	let li;
    	let t0_value = /*elem*/ ctx[12].name + "";
    	let t0;
    	let t1;
    	let t2_value = /*elem*/ ctx[12].value + "";
    	let t2;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(" - ");
    			t2 = text(t2_value);
    			attr_dev(li, "class", "list-group-item");
    			add_location(li, file, 194, 14, 5264);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);
    			append_dev(li, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*texturequery_result*/ 128 && t0_value !== (t0_value = /*elem*/ ctx[12].name + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*texturequery_result*/ 128 && t2_value !== (t2_value = /*elem*/ ctx[12].value + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(194:12) {#each texturequery_result as elem}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div11;
    	let div1;
    	let div0;
    	let h1;
    	let t1;
    	let p0;
    	let t2;
    	let a0;
    	let t4;
    	let t5;
    	let div10;
    	let div5;
    	let form0;
    	let div2;
    	let label0;
    	let t7;
    	let input0;
    	let t8;
    	let t9;
    	let p1;
    	let a1;
    	let t11;
    	let t12;
    	let div4;
    	let div3;
    	let t13;
    	let t14;
    	let ul0;
    	let t15;
    	let div9;
    	let form1;
    	let div6;
    	let label1;
    	let t17;
    	let input1;
    	let t18;
    	let t19;
    	let p2;
    	let a2;
    	let t21;
    	let t22;
    	let div8;
    	let div7;
    	let t23;
    	let t24;
    	let ul1;
    	let dispose;
    	let if_block0 = /*soiltypequery_error*/ ctx[4].length > 0 && create_if_block_3(ctx);
    	let if_block1 = /*soiltype_loading*/ ctx[2] && create_if_block_2(ctx);
    	let each_value_1 = /*soiltypequery_result*/ ctx[6];
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let if_block2 = /*texturequery_error*/ ctx[5].length > 0 && create_if_block_1(ctx);
    	let if_block3 = /*texture_loading*/ ctx[3] && create_if_block(ctx);
    	let each_value = /*texturequery_result*/ ctx[7];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			div11 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Soil Texture Demo App";
    			t1 = space();
    			p0 = element("p");
    			t2 = text("Visit the\n          ");
    			a0 = element("a");
    			a0.textContent = "EstSoil-EH v1.0: An eco-hydrological modelling parameters dataset\n            derived from the Soil Map of Estonia";
    			t4 = text("\n          to learn more about the dataset.");
    			t5 = space();
    			div10 = element("div");
    			div5 = element("div");
    			form0 = element("form");
    			div2 = element("div");
    			label0 = element("label");
    			label0.textContent = "Soiltype / Siffer";
    			t7 = space();
    			input0 = element("input");
    			t8 = space();
    			if (if_block0) if_block0.c();
    			t9 = space();
    			p1 = element("p");
    			a1 = element("a");
    			a1.textContent = "Submit";
    			t11 = space();
    			if (if_block1) if_block1.c();
    			t12 = space();
    			div4 = element("div");
    			div3 = element("div");
    			t13 = text(/*soiltypequery_tq*/ ctx[0]);
    			t14 = space();
    			ul0 = element("ul");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t15 = space();
    			div9 = element("div");
    			form1 = element("form");
    			div6 = element("div");
    			label1 = element("label");
    			label1.textContent = "Texture / Lõimis";
    			t17 = space();
    			input1 = element("input");
    			t18 = space();
    			if (if_block2) if_block2.c();
    			t19 = space();
    			p2 = element("p");
    			a2 = element("a");
    			a2.textContent = "Submit";
    			t21 = space();
    			if (if_block3) if_block3.c();
    			t22 = space();
    			div8 = element("div");
    			div7 = element("div");
    			t23 = text(/*texturequery_tq*/ ctx[1]);
    			t24 = space();
    			ul1 = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h1, "class", "svelte-1e9puaw");
    			add_location(h1, file, 111, 8, 2638);
    			attr_dev(a0, "href", "https://www.earth-syst-sci-data-discuss.net/essd-2019-192/");
    			add_location(a0, file, 115, 10, 2712);
    			add_location(p0, file, 113, 8, 2678);
    			attr_dev(div0, "class", "col-8");
    			add_location(div0, file, 110, 6, 2610);
    			attr_dev(div1, "class", "row");
    			add_location(div1, file, 109, 4, 2586);
    			attr_dev(label0, "for", "soiltypequery");
    			add_location(label0, file, 128, 12, 3115);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "form-control");
    			attr_dev(input0, "id", "soiltypequery");
    			attr_dev(input0, "aria-describedby", "SoilTypeHelp");
    			add_location(input0, file, 129, 12, 3180);
    			attr_dev(div2, "class", "form-group");
    			add_location(div2, file, 127, 10, 3078);
    			attr_dev(a1, "class", "btn btn-primary");
    			add_location(a1, file, 142, 12, 3623);
    			add_location(p1, file, 141, 10, 3607);
    			add_location(form0, file, 126, 8, 3061);
    			attr_dev(div3, "class", "card-header");
    			add_location(div3, file, 152, 12, 3939);
    			attr_dev(ul0, "class", "list-group list-group-flush");
    			add_location(ul0, file, 153, 12, 4001);
    			attr_dev(div4, "class", "card");
    			add_location(div4, file, 151, 8, 3908);
    			attr_dev(div5, "class", "col-4");
    			add_location(div5, file, 125, 6, 3033);
    			attr_dev(label1, "for", "texturequery");
    			add_location(label1, file, 166, 12, 4336);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "id", "texturequery");
    			add_location(input1, file, 167, 12, 4399);
    			attr_dev(div6, "class", "form-group");
    			add_location(div6, file, 165, 10, 4299);
    			attr_dev(a2, "class", "btn btn-primary");
    			add_location(a2, file, 181, 12, 4788);
    			add_location(p2, file, 180, 10, 4772);
    			add_location(form1, file, 164, 8, 4282);
    			attr_dev(div7, "class", "card-header");
    			add_location(div7, file, 191, 10, 5100);
    			attr_dev(ul1, "class", "list-group list-group-flush");
    			add_location(ul1, file, 192, 12, 5161);
    			attr_dev(div8, "class", "card");
    			add_location(div8, file, 190, 8, 5071);
    			attr_dev(div9, "class", "col-4");
    			add_location(div9, file, 163, 6, 4254);
    			attr_dev(div10, "class", "row");
    			add_location(div10, file, 124, 4, 3009);
    			attr_dev(div11, "class", "container-fluid");
    			add_location(div11, file, 108, 2, 2552);
    			attr_dev(main, "class", "svelte-1e9puaw");
    			add_location(main, file, 107, 0, 2543);

    			dispose = [
    				listen_dev(input0, "input", /*input0_input_handler*/ ctx[10]),
    				listen_dev(a1, "click", /*querySoilType*/ ctx[8], false, false, false),
    				listen_dev(input1, "input", /*input1_input_handler*/ ctx[11]),
    				listen_dev(a2, "click", /*queryTexture*/ ctx[9], false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div11);
    			append_dev(div11, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t1);
    			append_dev(div0, p0);
    			append_dev(p0, t2);
    			append_dev(p0, a0);
    			append_dev(p0, t4);
    			append_dev(div11, t5);
    			append_dev(div11, div10);
    			append_dev(div10, div5);
    			append_dev(div5, form0);
    			append_dev(form0, div2);
    			append_dev(div2, label0);
    			append_dev(div2, t7);
    			append_dev(div2, input0);
    			set_input_value(input0, /*soiltypequery_tq*/ ctx[0]);
    			append_dev(div2, t8);
    			if (if_block0) if_block0.m(div2, null);
    			append_dev(form0, t9);
    			append_dev(form0, p1);
    			append_dev(p1, a1);
    			append_dev(p1, t11);
    			if (if_block1) if_block1.m(p1, null);
    			append_dev(div5, t12);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, t13);
    			append_dev(div4, t14);
    			append_dev(div4, ul0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(ul0, null);
    			}

    			append_dev(div10, t15);
    			append_dev(div10, div9);
    			append_dev(div9, form1);
    			append_dev(form1, div6);
    			append_dev(div6, label1);
    			append_dev(div6, t17);
    			append_dev(div6, input1);
    			set_input_value(input1, /*texturequery_tq*/ ctx[1]);
    			append_dev(form1, t18);
    			if (if_block2) if_block2.m(form1, null);
    			append_dev(form1, t19);
    			append_dev(form1, p2);
    			append_dev(p2, a2);
    			append_dev(p2, t21);
    			if (if_block3) if_block3.m(p2, null);
    			append_dev(div9, t22);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, t23);
    			append_dev(div8, t24);
    			append_dev(div8, ul1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul1, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*soiltypequery_tq*/ 1 && input0.value !== /*soiltypequery_tq*/ ctx[0]) {
    				set_input_value(input0, /*soiltypequery_tq*/ ctx[0]);
    			}

    			if (/*soiltypequery_error*/ ctx[4].length > 0) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(div2, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*soiltype_loading*/ ctx[2]) {
    				if (!if_block1) {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(p1, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*soiltypequery_tq*/ 1) set_data_dev(t13, /*soiltypequery_tq*/ ctx[0]);

    			if (dirty & /*soiltypequery_result*/ 64) {
    				each_value_1 = /*soiltypequery_result*/ ctx[6];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(ul0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*texturequery_tq*/ 2 && input1.value !== /*texturequery_tq*/ ctx[1]) {
    				set_input_value(input1, /*texturequery_tq*/ ctx[1]);
    			}

    			if (/*texturequery_error*/ ctx[5].length > 0) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					if_block2.m(form1, t19);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*texture_loading*/ ctx[3]) {
    				if (!if_block3) {
    					if_block3 = create_if_block(ctx);
    					if_block3.c();
    					if_block3.m(p2, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (dirty & /*texturequery_tq*/ 2) set_data_dev(t23, /*texturequery_tq*/ ctx[1]);

    			if (dirty & /*texturequery_result*/ 128) {
    				each_value = /*texturequery_result*/ ctx[7];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			destroy_each(each_blocks_1, detaching);
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			destroy_each(each_blocks, detaching);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let soiltypequery_tq = "M''";
    	let texturequery_tq = "ls";
    	let soiltype_loading = false;
    	let texture_loading = false;
    	let soiltypequery_error = "";
    	let texturequery_error = "";
    	let soiltypequery_result = [];
    	let texturequery_result = [];

    	async function querySoilType() {
    		$$invalidate(2, soiltype_loading = true);
    		const q = { "tq": soiltypequery_tq };
    		const req_data = JSON.stringify(q);

    		try {
    			const response = await fetch("https://europe-west1-glomodat.cloudfunctions.net/estsoil_cf", {
    				method: "POST",
    				mode: "cors",
    				headers: { "Content-Type": "application/json" },
    				body: req_data
    			});

    			const data = await response.json();
    			$$invalidate(6, soiltypequery_result = []);

    			for (const [key, value] of Object.entries(data)) {
    				soiltypequery_result.push({ "name": key, value });
    			}

    			$$invalidate(2, soiltype_loading = false);
    			return data;
    		} catch(err) {
    			console.log(err.toString());
    			$$invalidate(2, soiltype_loading = false);
    			$$invalidate(4, soiltypequery_error = `${err.toString()}`);
    		}
    	}

    	async function queryTexture() {
    		$$invalidate(3, texture_loading = true);
    		const q = { "tq": texturequery_tq };
    		const req_data = JSON.stringify(q);

    		try {
    			const response = await fetch("https://europe-west1-glomodat.cloudfunctions.net/estsoil_lm", {
    				method: "POST",
    				mode: "cors",
    				headers: { "Content-Type": "application/json" },
    				body: req_data
    			});

    			const data = await response.json();
    			$$invalidate(7, texturequery_result = []);

    			for (const [key, value] of Object.entries(data)) {
    				texturequery_result.push({ "name": key, value });
    			}

    			$$invalidate(3, texture_loading = false);
    			return data;
    		} catch(err) {
    			console.log(err.toString());
    			$$invalidate(3, texture_loading = false);
    			$$invalidate(5, texturequery_error = `${err.toString()}`);
    		}
    	}

    	function input0_input_handler() {
    		soiltypequery_tq = this.value;
    		$$invalidate(0, soiltypequery_tq);
    	}

    	function input1_input_handler() {
    		texturequery_tq = this.value;
    		$$invalidate(1, texturequery_tq);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("soiltypequery_tq" in $$props) $$invalidate(0, soiltypequery_tq = $$props.soiltypequery_tq);
    		if ("texturequery_tq" in $$props) $$invalidate(1, texturequery_tq = $$props.texturequery_tq);
    		if ("soiltype_loading" in $$props) $$invalidate(2, soiltype_loading = $$props.soiltype_loading);
    		if ("texture_loading" in $$props) $$invalidate(3, texture_loading = $$props.texture_loading);
    		if ("soiltypequery_error" in $$props) $$invalidate(4, soiltypequery_error = $$props.soiltypequery_error);
    		if ("texturequery_error" in $$props) $$invalidate(5, texturequery_error = $$props.texturequery_error);
    		if ("soiltypequery_result" in $$props) $$invalidate(6, soiltypequery_result = $$props.soiltypequery_result);
    		if ("texturequery_result" in $$props) $$invalidate(7, texturequery_result = $$props.texturequery_result);
    	};

    	return [
    		soiltypequery_tq,
    		texturequery_tq,
    		soiltype_loading,
    		texture_loading,
    		soiltypequery_error,
    		texturequery_error,
    		soiltypequery_result,
    		texturequery_result,
    		querySoilType,
    		queryTexture,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
