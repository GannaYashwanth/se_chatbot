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
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function set_store_value(store, ret, value) {
        store.set(value);
        return ret;
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
    function empty() {
        return text('');
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
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
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
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
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
        }
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
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
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
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
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
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
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.47.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    /* webviews\components\Sidebar.svelte generated by Svelte v3.47.0 */
    const file = "webviews\\components\\Sidebar.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (150:24) {:else}
    function create_else_block(ctx) {
    	let div1;
    	let div0;
    	let span;
    	let t0_value = /*msg*/ ctx[6].msg + "";
    	let t0;
    	let t1;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			img = element("img");
    			attr_dev(span, "class", "msg-to-chatbot svelte-awjtdf");
    			add_location(span, file, 152, 40, 4653);
    			attr_dev(div0, "class", "msg-to-chatbot-container svelte-awjtdf");
    			add_location(div0, file, 151, 33, 4573);
    			attr_dev(img, "class", "image svelte-awjtdf");
    			attr_dev(img, "alt", "");
    			if (!src_url_equal(img.src, img_src_value = "https://d1tgh8fmlzexmh.cloudfront.net/ccbp-dynamic-webapps/chatbot-boy-img.png")) attr_dev(img, "src", img_src_value);
    			add_location(img, file, 157, 16, 4853);
    			attr_dev(div1, "class", "d-flex flex-row justify-content-end");
    			add_location(div1, file, 150, 7, 4489);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, span);
    			append_dev(span, t0);
    			append_dev(div1, t1);
    			append_dev(div1, img);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$Messages*/ 2 && t0_value !== (t0_value = /*msg*/ ctx[6].msg + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(150:24) {:else}",
    		ctx
    	});

    	return block;
    }

    // (140:16) {#if msg.id == 0}
    function create_if_block(ctx) {
    	let div1;
    	let img;
    	let img_src_value;
    	let t0;
    	let div0;
    	let span;
    	let t1_value = /*msg*/ ctx[6].msg + "";
    	let t1;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			img = element("img");
    			t0 = space();
    			div0 = element("div");
    			span = element("span");
    			t1 = text(t1_value);
    			attr_dev(img, "class", "image svelte-awjtdf");
    			attr_dev(img, "alt", "");
    			if (!src_url_equal(img.src, img_src_value = "https://d1tgh8fmlzexmh.cloudfront.net/ccbp-dynamic-webapps/chatbot-bot-img.png")) attr_dev(img, "src", img_src_value);
    			add_location(img, file, 141, 22, 4012);
    			attr_dev(span, "class", "msg-from-chatbot svelte-awjtdf");
    			add_location(span, file, 143, 40, 4233);
    			attr_dev(div0, "class", "msg-from-chatbot-container svelte-awjtdf");
    			add_location(div0, file, 142, 24, 4151);
    			attr_dev(div1, "class", "d-flex flex-row ");
    			add_location(div1, file, 140, 9, 3958);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, img);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, span);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$Messages*/ 2 && t1_value !== (t1_value = /*msg*/ ctx[6].msg + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(140:16) {#if msg.id == 0}",
    		ctx
    	});

    	return block;
    }

    // (139:8) {#each $Messages as msg}
    function create_each_block(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*msg*/ ctx[6].id == 0) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(139:8) {#each $Messages as msg}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let link;
    	let script0;
    	let script0_src_value;
    	let script1;
    	let script1_src_value;
    	let script2;
    	let script2_src_value;
    	let script3;
    	let script3_src_value;
    	let style;
    	let t1;
    	let div4;
    	let nav;
    	let a;
    	let t3;
    	let div3;
    	let h1;
    	let t5;
    	let div2;
    	let t6;
    	let div1;
    	let div0;
    	let input;
    	let t7;
    	let button;
    	let i;
    	let mounted;
    	let dispose;
    	let each_value = /*$Messages*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			link = element("link");
    			script0 = element("script");
    			script1 = element("script");
    			script2 = element("script");
    			script3 = element("script");
    			style = element("style");
    			style.textContent = "::-webkit-scrollbar{\r\n  \t\twidth:0;\r\n\t\t}\r\n    *{\r\n        margin:0;\r\n        padding:0;\r\n        box-sizing:border-box;\r\n    }\r\n\t\t\tbody{\r\n  width:100vw;\r\n  min-width: 500px;\r\n  height:100vh;\r\n\r\n  display:grid;\r\n}";
    			t1 = space();
    			div4 = element("div");
    			nav = element("nav");
    			a = element("a");
    			a.textContent = "Meet our Chatbot";
    			t3 = space();
    			div3 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Meet our Chatbot";
    			t5 = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t6 = space();
    			div1 = element("div");
    			div0 = element("div");
    			input = element("input");
    			t7 = space();
    			button = element("button");
    			i = element("i");
    			attr_dev(link, "rel", "stylesheet");
    			attr_dev(link, "href", "https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css");
    			attr_dev(link, "integrity", "sha384-JcKb8q3iqJ61gNV9KGb8thSsNjpSL0n8PARn9HuZOnIxN0hoP+VmmDGMN5t9UJ0Z");
    			attr_dev(link, "crossorigin", "anonymous");
    			add_location(link, file, 102, 12, 2352);
    			if (!src_url_equal(script0.src, script0_src_value = "https://code.jquery.com/jquery-3.5.1.slim.min.js")) attr_dev(script0, "src", script0_src_value);
    			attr_dev(script0, "integrity", "sha384-DfXdz2htPH0lsSSs5nCTpuj/zy4C+OGpamoFVy38MVBnE+IbbVYUew+OrCXaRkfj");
    			attr_dev(script0, "crossorigin", "anonymous");
    			add_location(script0, file, 103, 8, 2575);
    			if (!src_url_equal(script1.src, script1_src_value = "https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js")) attr_dev(script1, "src", script1_src_value);
    			attr_dev(script1, "integrity", "sha384-9/reFTGAW83EW2RDu2S0VKaIzap3H66lZH81PoYlFhbGU+6BZp6G7niu735Sk7lN");
    			attr_dev(script1, "crossorigin", "anonymous");
    			add_location(script1, file, 104, 8, 2765);
    			if (!src_url_equal(script2.src, script2_src_value = "https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js")) attr_dev(script2, "src", script2_src_value);
    			attr_dev(script2, "integrity", "sha384-B4gt1jrGC7Jh4AgTPSdUtOBvfO8shuf57BaghqFfPlYxofvL8/KUEfYiJOMMV+rV");
    			attr_dev(script2, "crossorigin", "anonymous");
    			add_location(script2, file, 105, 8, 2975);
    			if (!src_url_equal(script3.src, script3_src_value = "https://kit.fontawesome.com/5f59ca6ad3.js")) attr_dev(script3, "src", script3_src_value);
    			attr_dev(script3, "crossorigin", "anonymous");
    			add_location(script3, file, 106, 8, 3187);
    			add_location(style, file, 108, 3, 3286);
    			attr_dev(a, "class", "navbar-brand");
    			attr_dev(a, "href", "/");
    			add_location(a, file, 130, 8, 3642);
    			attr_dev(nav, "class", "navbar fixed-top navbar-light bg-light svelte-awjtdf");
    			add_location(nav, file, 129, 6, 3580);
    			attr_dev(h1, "class", "text-center chatbot-heading svelte-awjtdf");
    			add_location(h1, file, 135, 12, 3754);
    			attr_dev(input, "class", "user-input svelte-awjtdf");
    			attr_dev(input, "id", "userInput");
    			add_location(input, file, 167, 16, 5193);
    			attr_dev(i, "class", "fas fa-paper-plane");
    			add_location(i, file, 169, 16, 5359);
    			attr_dev(button, "class", "send-msg-btn svelte-awjtdf");
    			attr_dev(button, "id", "sendMsgBtn");
    			add_location(button, file, 168, 16, 5274);
    			attr_dev(div0, "class", "d-flex flex-row justify-content-center fixed-bottom");
    			add_location(div0, file, 166, 12, 5110);
    			attr_dev(div1, "class", "msg_box");
    			add_location(div1, file, 165, 8, 5075);
    			attr_dev(div2, "class", "chat-container svelte-awjtdf");
    			attr_dev(div2, "id", "chatContainer");
    			add_location(div2, file, 137, 12, 3831);
    			attr_dev(div3, "class", "p-2");
    			add_location(div3, file, 133, 8, 3721);
    			attr_dev(div4, "class", "main");
    			add_location(div4, file, 128, 2, 3554);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, link);
    			append_dev(document.head, script0);
    			append_dev(document.head, script1);
    			append_dev(document.head, script2);
    			append_dev(document.head, script3);
    			append_dev(document.head, style);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, nav);
    			append_dev(nav, a);
    			append_dev(div4, t3);
    			append_dev(div4, div3);
    			append_dev(div3, h1);
    			append_dev(div3, t5);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			append_dev(div2, t6);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, input);
    			set_input_value(input, /*message*/ ctx[0]);
    			append_dev(div0, t7);
    			append_dev(div0, button);
    			append_dev(button, i);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[4]),
    					listen_dev(button, "click", /*click_handler*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$Messages*/ 2) {
    				each_value = /*$Messages*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div2, t6);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*message*/ 1 && input.value !== /*message*/ ctx[0]) {
    				set_input_value(input, /*message*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			detach_dev(link);
    			detach_dev(script0);
    			detach_dev(script1);
    			detach_dev(script2);
    			detach_dev(script3);
    			detach_dev(style);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div4);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
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
    	let $Messages;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Sidebar', slots, []);
    	let Messages = writable({});
    	validate_store(Messages, 'Messages');
    	component_subscribe($$self, Messages, value => $$invalidate(1, $Messages = value));
    	let message = '';

    	set_store_value(
    		Messages,
    		$Messages = [
    			{
    				id: 0,
    				msg: 'This is BotPy. How can i help you?'
    			},
    			{ id: 1, msg: 'Good Morning !' },
    			{ id: 0, msg: 'Good Morning !!' },
    			{ id: 1, msg: 'Welcome ..' },
    			{
    				id: 0,
    				msg: 'I Know you are a good developer'
    			},
    			{ id: 1, msg: 'Ohh !' },
    			{ id: 1, msg: 'Bye !!' },
    			{ id: 0, msg: 'See you soon !' }
    		],
    		$Messages
    	);

    	function Text() {
    		var l = $Messages.length;
    		set_store_value(Messages, $Messages[l] = { id: 1, msg: message }, $Messages);
    		set_store_value(Messages, $Messages[l + 1] = { id: 0, msg: 'still in development mode' }, $Messages);
    		$$invalidate(0, message = '');
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Sidebar> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		message = this.value;
    		$$invalidate(0, message);
    	}

    	const click_handler = () => Text();

    	$$self.$capture_state = () => ({
    		writable,
    		Messages,
    		message,
    		Text,
    		$Messages
    	});

    	$$self.$inject_state = $$props => {
    		if ('Messages' in $$props) $$invalidate(2, Messages = $$props.Messages);
    		if ('message' in $$props) $$invalidate(0, message = $$props.message);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [message, $Messages, Messages, Text, input_input_handler, click_handler];
    }

    class Sidebar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Sidebar",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new Sidebar({
        target: document.body,
    });

    return app;

})();
//# sourceMappingURL=SideBar.js.map
