
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

    // (104:10) {#if soiltypequery_result.soil_type}
    function create_if_block_1(ctx) {
    	let div;
    	let t1;
    	let ul;
    	let li;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Featured";
    			t1 = space();
    			ul = element("ul");
    			li = element("li");
    			li.textContent = "Cras justo odio";
    			attr_dev(div, "class", "card-header");
    			add_location(div, file, 104, 12, 2517);
    			attr_dev(li, "class", "list-group-item");
    			add_location(li, file, 106, 14, 2624);
    			attr_dev(ul, "class", "list-group list-group-flush");
    			add_location(ul, file, 105, 12, 2569);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, ul, anchor);
    			append_dev(ul, li);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(ul);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(104:10) {#if soiltypequery_result.soil_type}",
    		ctx
    	});

    	return block;
    }

    // (131:10) {#if texturequery_result.Loimis1}
    function create_if_block(ctx) {
    	let div;
    	let t1;
    	let ul;
    	let li0;
    	let t3;
    	let li1;
    	let t5;
    	let li2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Featured";
    			t1 = space();
    			ul = element("ul");
    			li0 = element("li");
    			li0.textContent = "Cras justo odio";
    			t3 = space();
    			li1 = element("li");
    			li1.textContent = "Dapibus ac facilisis in";
    			t5 = space();
    			li2 = element("li");
    			li2.textContent = "Vestibulum at eros";
    			attr_dev(div, "class", "card-header");
    			add_location(div, file, 131, 12, 3344);
    			attr_dev(li0, "class", "list-group-item");
    			add_location(li0, file, 133, 14, 3451);
    			attr_dev(li1, "class", "list-group-item");
    			add_location(li1, file, 134, 14, 3514);
    			attr_dev(li2, "class", "list-group-item");
    			add_location(li2, file, 135, 14, 3585);
    			attr_dev(ul, "class", "list-group list-group-flush");
    			add_location(ul, file, 132, 12, 3396);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, ul, anchor);
    			append_dev(ul, li0);
    			append_dev(ul, t3);
    			append_dev(ul, li1);
    			append_dev(ul, t5);
    			append_dev(ul, li2);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(ul);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(131:10) {#if texturequery_result.Loimis1}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div10;
    	let div1;
    	let div0;
    	let h1;
    	let t1;
    	let p;
    	let t2;
    	let a0;
    	let t4;
    	let t5;
    	let div5;
    	let div4;
    	let form0;
    	let div2;
    	let label0;
    	let t7;
    	let input0;
    	let t8;
    	let small0;
    	let t10;
    	let a1;
    	let t12;
    	let div3;
    	let t13;
    	let div9;
    	let div8;
    	let form1;
    	let div6;
    	let label1;
    	let t15;
    	let input1;
    	let t16;
    	let small1;
    	let t18;
    	let a2;
    	let t20;
    	let div7;
    	let dispose;
    	let if_block0 = /*soiltypequery_result*/ ctx[2].soil_type && create_if_block_1(ctx);
    	let if_block1 = /*texturequery_result*/ ctx[3].Loimis1 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div10 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Soil Texture Demo App";
    			t1 = space();
    			p = element("p");
    			t2 = text("Visit the\n          ");
    			a0 = element("a");
    			a0.textContent = "EstSoil-EH v1.0: An eco-hydrological modelling parameters dataset\n            derived from the Soil Map of Estonia";
    			t4 = text("\n          to learn more about the dataset.");
    			t5 = space();
    			div5 = element("div");
    			div4 = element("div");
    			form0 = element("form");
    			div2 = element("div");
    			label0 = element("label");
    			label0.textContent = "Soiltype / Siffer";
    			t7 = space();
    			input0 = element("input");
    			t8 = space();
    			small0 = element("small");
    			small0.textContent = "We'll never share your email with anyone else.";
    			t10 = space();
    			a1 = element("a");
    			a1.textContent = "Submit";
    			t12 = space();
    			div3 = element("div");
    			if (if_block0) if_block0.c();
    			t13 = space();
    			div9 = element("div");
    			div8 = element("div");
    			form1 = element("form");
    			div6 = element("div");
    			label1 = element("label");
    			label1.textContent = "Texture / Lõimis";
    			t15 = space();
    			input1 = element("input");
    			t16 = space();
    			small1 = element("small");
    			small1.textContent = "We'll never share your email with anyone else.";
    			t18 = space();
    			a2 = element("a");
    			a2.textContent = "Submit";
    			t20 = space();
    			div7 = element("div");
    			if (if_block1) if_block1.c();
    			attr_dev(h1, "class", "svelte-1e9puaw");
    			add_location(h1, file, 71, 8, 1438);
    			attr_dev(a0, "href", "https://www.earth-syst-sci-data-discuss.net/essd-2019-192/");
    			add_location(a0, file, 75, 10, 1512);
    			add_location(p, file, 73, 8, 1478);
    			attr_dev(div0, "class", "col-4");
    			add_location(div0, file, 70, 6, 1410);
    			attr_dev(div1, "class", "row");
    			add_location(div1, file, 69, 4, 1386);
    			attr_dev(label0, "for", "soiltypequery");
    			add_location(label0, file, 88, 12, 1915);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "form-control");
    			attr_dev(input0, "id", "soiltypequery");
    			attr_dev(input0, "aria-describedby", "SoilTypeHelp");
    			add_location(input0, file, 89, 12, 1980);
    			attr_dev(small0, "id", "SoilTypeHelp");
    			attr_dev(small0, "class", "form-text text-muted");
    			add_location(small0, file, 95, 12, 2187);
    			attr_dev(div2, "class", "form-group");
    			add_location(div2, file, 87, 10, 1878);
    			attr_dev(a1, "class", "btn btn-primary");
    			add_location(a1, file, 99, 10, 2351);
    			add_location(form0, file, 86, 8, 1861);
    			attr_dev(div3, "class", "card");
    			add_location(div3, file, 102, 8, 2439);
    			attr_dev(div4, "class", "col-4");
    			add_location(div4, file, 85, 6, 1833);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file, 84, 4, 1809);
    			attr_dev(label1, "for", "texturequery");
    			add_location(label1, file, 118, 12, 2858);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "id", "texturequery");
    			add_location(input1, file, 119, 12, 2921);
    			attr_dev(div6, "class", "form-group");
    			add_location(div6, file, 117, 10, 2821);
    			attr_dev(small1, "id", "textureHelp");
    			attr_dev(small1, "class", "form-text text-muted");
    			add_location(small1, file, 122, 10, 3039);
    			attr_dev(a2, "class", "btn btn-primary");
    			add_location(a2, file, 126, 10, 3182);
    			add_location(form1, file, 116, 8, 2804);
    			attr_dev(div7, "class", "card");
    			add_location(div7, file, 129, 8, 3269);
    			attr_dev(div8, "class", "col-4");
    			add_location(div8, file, 115, 6, 2776);
    			attr_dev(div9, "class", "row");
    			add_location(div9, file, 114, 4, 2752);
    			attr_dev(div10, "class", "container-fluid");
    			add_location(div10, file, 68, 2, 1352);
    			attr_dev(main, "class", "svelte-1e9puaw");
    			add_location(main, file, 67, 0, 1343);

    			dispose = [
    				listen_dev(input0, "input", /*input0_input_handler*/ ctx[6]),
    				listen_dev(a1, "click", /*querySoilType*/ ctx[4], false, false, false),
    				listen_dev(input1, "input", /*input1_input_handler*/ ctx[7]),
    				listen_dev(a2, "click", /*queryTexture*/ ctx[5], false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div10);
    			append_dev(div10, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t1);
    			append_dev(div0, p);
    			append_dev(p, t2);
    			append_dev(p, a0);
    			append_dev(p, t4);
    			append_dev(div10, t5);
    			append_dev(div10, div5);
    			append_dev(div5, div4);
    			append_dev(div4, form0);
    			append_dev(form0, div2);
    			append_dev(div2, label0);
    			append_dev(div2, t7);
    			append_dev(div2, input0);
    			set_input_value(input0, /*soiltypequery_tq*/ ctx[0]);
    			append_dev(div2, t8);
    			append_dev(div2, small0);
    			append_dev(form0, t10);
    			append_dev(form0, a1);
    			append_dev(div4, t12);
    			append_dev(div4, div3);
    			if (if_block0) if_block0.m(div3, null);
    			append_dev(div10, t13);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div8, form1);
    			append_dev(form1, div6);
    			append_dev(div6, label1);
    			append_dev(div6, t15);
    			append_dev(div6, input1);
    			set_input_value(input1, /*texturequery_tq*/ ctx[1]);
    			append_dev(form1, t16);
    			append_dev(form1, small1);
    			append_dev(form1, t18);
    			append_dev(form1, a2);
    			append_dev(div8, t20);
    			append_dev(div8, div7);
    			if (if_block1) if_block1.m(div7, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*soiltypequery_tq*/ 1 && input0.value !== /*soiltypequery_tq*/ ctx[0]) {
    				set_input_value(input0, /*soiltypequery_tq*/ ctx[0]);
    			}

    			if (dirty & /*texturequery_tq*/ 2 && input1.value !== /*texturequery_tq*/ ctx[1]) {
    				set_input_value(input1, /*texturequery_tq*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
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
    	let soiltypequery_result = {};
    	let texturequery_result = {};

    	async function querySoilType() {
    		const req_data = JSON.stringify({ "tq": soiltypequery_tq });

    		const response = await fetch("https://europe-west1-glomodat.cloudfunctions.net/estsoil_cf", {
    			method: "POST",
    			mode: "cors",
    			headers: { "Content-Type": "application/json" },
    			body: req_data
    		});

    		const data = await response.json();
    		return data;
    	}

    	

    	async function queryTexture() {
    		const req_data = JSON.stringify({ "tq": texturequery_tq });

    		const response = await fetch("https://europe-west1-glomodat.cloudfunctions.net/estsoil_lm", {
    			method: "POST",
    			mode: "cors",
    			headers: { "Content-Type": "application/json" },
    			body: req_data
    		});

    		const data = await response.json();
    		return data;
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
    		if ("soiltypequery_result" in $$props) $$invalidate(2, soiltypequery_result = $$props.soiltypequery_result);
    		if ("texturequery_result" in $$props) $$invalidate(3, texturequery_result = $$props.texturequery_result);
    	};

    	return [
    		soiltypequery_tq,
    		texturequery_tq,
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
