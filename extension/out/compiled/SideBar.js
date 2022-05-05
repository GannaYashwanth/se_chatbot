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
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
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
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function beforeUpdate(fn) {
        get_current_component().$$.before_update.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
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
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    // (217:24) {:else}
    function create_else_block_1(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let t0_value = /*msg*/ ctx[16].msg + "";
    	let t0;
    	let t1;
    	let img;
    	let img_src_value;
    	let t2;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			img = element("img");
    			t2 = space();
    			attr_dev(div0, "class", "msg-to-chatbot svelte-1ng5btm");
    			add_location(div0, file, 219, 40, 6828);
    			attr_dev(div1, "class", "msg-to-chatbot-container svelte-1ng5btm");
    			add_location(div1, file, 218, 33, 6748);
    			attr_dev(img, "class", "image svelte-1ng5btm");
    			attr_dev(img, "alt", "");
    			if (!src_url_equal(img.src, img_src_value = "https://d1tgh8fmlzexmh.cloudfront.net/ccbp-dynamic-webapps/chatbot-boy-img.png")) attr_dev(img, "src", img_src_value);
    			add_location(img, file, 224, 16, 7026);
    			attr_dev(div2, "class", "d-flex flex-row justify-content-end");
    			add_location(div2, file, 217, 7, 6664);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, img);
    			append_dev(div2, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$Messages*/ 8 && t0_value !== (t0_value = /*msg*/ ctx[16].msg + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(217:24) {:else}",
    		ctx
    	});

    	return block;
    }

    // (201:16) {#if msg.id == 0}
    function create_if_block(ctx) {
    	let div1;
    	let img;
    	let img_src_value;
    	let t0;
    	let div0;
    	let t1;

    	function select_block_type_1(ctx, dirty) {
    		if (/*msg*/ ctx[16].link == 0) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			img = element("img");
    			t0 = space();
    			div0 = element("div");
    			if_block.c();
    			t1 = space();
    			attr_dev(img, "class", "image svelte-1ng5btm");
    			attr_dev(img, "alt", "");
    			if (!src_url_equal(img.src, img_src_value = "https://d1tgh8fmlzexmh.cloudfront.net/ccbp-dynamic-webapps/chatbot-bot-img.png")) attr_dev(img, "src", img_src_value);
    			add_location(img, file, 202, 22, 5626);
    			attr_dev(div0, "class", "msg-from-chatbot-container svelte-1ng5btm");
    			add_location(div0, file, 203, 24, 5765);
    			attr_dev(div1, "class", "d-flex flex-row ");
    			add_location(div1, file, 201, 9, 5572);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, img);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			if_block.m(div0, null);
    			append_dev(div1, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(201:16) {#if msg.id == 0}",
    		ctx
    	});

    	return block;
    }

    // (209:48) {:else}
    function create_else_block(ctx) {
    	let div_1;
    	let a;
    	let t_value = /*msg*/ ctx[16].msg + "";
    	let t;
    	let a_href_value;

    	const block = {
    		c: function create() {
    			div_1 = element("div");
    			a = element("a");
    			t = text(t_value);
    			attr_dev(a, "href", a_href_value = /*msg*/ ctx[16].msg);
    			add_location(a, file, 210, 52, 6400);
    			attr_dev(div_1, "class", "msg-from-chatbot svelte-1ng5btm");
    			set_style(div_1, "white-space", "pre-wrap");
    			set_style(div_1, "white-space", "-moz-pre-wrap");
    			set_style(div_1, "white-space", "-pre-wrap");
    			set_style(div_1, "white-space", "-o-pre-wrap");
    			set_style(div_1, "word-wrap", "break-word");
    			add_location(div_1, file, 209, 48, 6180);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div_1, anchor);
    			append_dev(div_1, a);
    			append_dev(a, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$Messages*/ 8 && t_value !== (t_value = /*msg*/ ctx[16].msg + "")) set_data_dev(t, t_value);

    			if (dirty & /*$Messages*/ 8 && a_href_value !== (a_href_value = /*msg*/ ctx[16].msg)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(209:48) {:else}",
    		ctx
    	});

    	return block;
    }

    // (205:48) {#if msg.link == 0}
    function create_if_block_1(ctx) {
    	let div_1;
    	let t_value = /*msg*/ ctx[16].msg + "";
    	let t;

    	const block = {
    		c: function create() {
    			div_1 = element("div");
    			t = text(t_value);
    			attr_dev(div_1, "class", "msg-from-chatbot svelte-1ng5btm");
    			add_location(div_1, file, 205, 48, 5924);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div_1, anchor);
    			append_dev(div_1, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$Messages*/ 8 && t_value !== (t_value = /*msg*/ ctx[16].msg + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(205:48) {#if msg.link == 0}",
    		ctx
    	});

    	return block;
    }

    // (200:20) {#each $Messages as msg}
    function create_each_block(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*msg*/ ctx[16].id == 0) return create_if_block;
    		return create_else_block_1;
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
    		source: "(200:20) {#each $Messages as msg}",
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
    	let div6;
    	let nav;
    	let a;
    	let t3;
    	let h1;
    	let t5;
    	let div0;
    	let t6;
    	let div5;
    	let div2;
    	let div1;
    	let button0;
    	let t8;
    	let button1;
    	let t10;
    	let div4;
    	let div3;
    	let input;
    	let t11;
    	let button2;
    	let i;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowresize*/ ctx[9]);
    	let each_value = /*$Messages*/ ctx[3];
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
    			style.textContent = "::-webkit-scrollbar{\r\n  \t\twidth:0;\r\n\t\t}\r\n    *{\r\n        margin:0;\r\n        padding:0;\r\n        box-sizing:border-box;\r\n    }\r\n\t\t\tbody{\r\n  width:100vw;\r\n  min-width: 400px;\r\n  height:100vh;\r\n\r\n  display:grid;\r\n}";
    			t1 = space();
    			div6 = element("div");
    			nav = element("nav");
    			a = element("a");
    			a.textContent = "Meet our Chatbot";
    			t3 = space();
    			h1 = element("h1");
    			h1.textContent = "Meet our Chatbot";
    			t5 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t6 = space();
    			div5 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			button0 = element("button");
    			button0.textContent = "Search numpy";
    			t8 = space();
    			button1 = element("button");
    			button1.textContent = "Search pandas";
    			t10 = space();
    			div4 = element("div");
    			div3 = element("div");
    			input = element("input");
    			t11 = space();
    			button2 = element("button");
    			i = element("i");
    			attr_dev(link, "rel", "stylesheet");
    			attr_dev(link, "href", "https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css");
    			attr_dev(link, "integrity", "sha384-JcKb8q3iqJ61gNV9KGb8thSsNjpSL0n8PARn9HuZOnIxN0hoP+VmmDGMN5t9UJ0Z");
    			attr_dev(link, "crossorigin", "anonymous");
    			add_location(link, file, 166, 12, 3922);
    			if (!src_url_equal(script0.src, script0_src_value = "https://code.jquery.com/jquery-3.5.1.slim.min.js")) attr_dev(script0, "src", script0_src_value);
    			attr_dev(script0, "integrity", "sha384-DfXdz2htPH0lsSSs5nCTpuj/zy4C+OGpamoFVy38MVBnE+IbbVYUew+OrCXaRkfj");
    			attr_dev(script0, "crossorigin", "anonymous");
    			add_location(script0, file, 167, 8, 4145);
    			if (!src_url_equal(script1.src, script1_src_value = "https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js")) attr_dev(script1, "src", script1_src_value);
    			attr_dev(script1, "integrity", "sha384-9/reFTGAW83EW2RDu2S0VKaIzap3H66lZH81PoYlFhbGU+6BZp6G7niu735Sk7lN");
    			attr_dev(script1, "crossorigin", "anonymous");
    			add_location(script1, file, 168, 8, 4335);
    			if (!src_url_equal(script2.src, script2_src_value = "https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js")) attr_dev(script2, "src", script2_src_value);
    			attr_dev(script2, "integrity", "sha384-B4gt1jrGC7Jh4AgTPSdUtOBvfO8shuf57BaghqFfPlYxofvL8/KUEfYiJOMMV+rV");
    			attr_dev(script2, "crossorigin", "anonymous");
    			add_location(script2, file, 169, 8, 4545);
    			if (!src_url_equal(script3.src, script3_src_value = "https://kit.fontawesome.com/5f59ca6ad3.js")) attr_dev(script3, "src", script3_src_value);
    			attr_dev(script3, "crossorigin", "anonymous");
    			add_location(script3, file, 170, 8, 4757);
    			add_location(style, file, 172, 3, 4856);
    			attr_dev(a, "class", "navbar-brand");
    			attr_dev(a, "href", "/");
    			add_location(a, file, 193, 8, 5213);
    			attr_dev(nav, "class", "navbar fixed-top navbar-light bg-light svelte-1ng5btm");
    			add_location(nav, file, 192, 6, 5151);
    			attr_dev(h1, "class", "text-center chatbot-heading svelte-1ng5btm");
    			add_location(h1, file, 195, 6, 5294);
    			attr_dev(div0, "class", "chat-container svelte-1ng5btm");
    			attr_dev(div0, "id", "chatContainer");
    			set_style(div0, "height", /*innerHeight*/ ctx[0] - 145 + "px");
    			add_location(div0, file, 198, 17, 5378);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "btn w-50 p-1 m-2 btn-secondary btn-sm ");
    			add_location(button0, file, 237, 12, 7402);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn w-50 p-1 m-2 btn-secondary btn-sm");
    			add_location(button1, file, 238, 12, 7529);
    			attr_dev(div1, "class", "d-flex flex-row justify-content-around");
    			add_location(div1, file, 236, 8, 7336);
    			add_location(div2, file, 235, 4, 7321);
    			attr_dev(input, "class", "user-input svelte-1ng5btm");
    			attr_dev(input, "id", "userInput");
    			add_location(input, file, 245, 12, 7776);
    			attr_dev(i, "class", "fas fa-paper-plane");
    			add_location(i, file, 247, 12, 7960);
    			attr_dev(button2, "class", "send-msg-btn svelte-1ng5btm");
    			attr_dev(button2, "id", "sendMsgBtn");
    			add_location(button2, file, 246, 12, 7879);
    			attr_dev(div3, "class", "d-flex flex-row fixed-bottom ");
    			add_location(div3, file, 244, 8, 7719);
    			attr_dev(div4, "class", "msg_box");
    			add_location(div4, file, 243, 4, 7687);
    			set_style(div5, "background-color", "rgb(179, 238, 238)");
    			add_location(div5, file, 234, 3, 7264);
    			attr_dev(div6, "class", "main");
    			add_location(div6, file, 191, 2, 5125);
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
    			insert_dev(target, div6, anchor);
    			append_dev(div6, nav);
    			append_dev(nav, a);
    			append_dev(div6, t3);
    			append_dev(div6, h1);
    			append_dev(div6, t5);
    			append_dev(div6, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			/*div0_binding*/ ctx[10](div0);
    			append_dev(div6, t6);
    			append_dev(div6, div5);
    			append_dev(div5, div2);
    			append_dev(div2, div1);
    			append_dev(div1, button0);
    			append_dev(div1, t8);
    			append_dev(div1, button1);
    			append_dev(div5, t10);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, input);
    			set_input_value(input, /*message*/ ctx[2]);
    			append_dev(div3, t11);
    			append_dev(div3, button2);
    			append_dev(button2, i);

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "resize", /*onwindowresize*/ ctx[9]),
    					listen_dev(button0, "click", /*click_handler*/ ctx[11], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[12], false, false, false),
    					listen_dev(input, "input", /*input_input_handler*/ ctx[13]),
    					listen_dev(input, "keydown", /*handleKeydown*/ ctx[8], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[14], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$Messages*/ 8) {
    				each_value = /*$Messages*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*innerHeight*/ 1) {
    				set_style(div0, "height", /*innerHeight*/ ctx[0] - 145 + "px");
    			}

    			if (dirty & /*message*/ 4 && input.value !== /*message*/ ctx[2]) {
    				set_input_value(input, /*message*/ ctx[2]);
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
    			if (detaching) detach_dev(div6);
    			destroy_each(each_blocks, detaching);
    			/*div0_binding*/ ctx[10](null);
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
    	let innerHeight;
    	let div;
    	let autoscroll;

    	beforeUpdate(() => {
    		autoscroll = div && div.offsetHeight + div.scrollTop > div.scrollHeight - 20;
    	});

    	afterUpdate(() => {
    		if (autoscroll) div.scrollTo(0, div.scrollHeight);
    	});

    	let Messages = writable({});
    	validate_store(Messages, 'Messages');
    	component_subscribe($$self, Messages, value => $$invalidate(3, $Messages = value));
    	let message = '';

    	set_store_value(
    		Messages,
    		$Messages = [
    			{
    				id: 0,
    				msg: 'This is Cary. How can i help you?',
    				link: 0
    			}
    		],
    		$Messages
    	);

    	async function Text() {
    		if (!message) return;
    		var l = $Messages.length;
    		set_store_value(Messages, $Messages[l] = { id: 1, msg: message }, $Messages);
    		let res = null;
    		res = await fetch('https://chatbotapi-se.herokuapp.com/' + message, { method: 'POST' }).then(x => x.json());
    		while (!res) set_store_value(Messages, $Messages[l + 1] = { id: 0, msg: "...", link: 0 }, $Messages);
    		set_store_value(Messages, $Messages[l + 1] = { id: 0, msg: res.result, link: 0 }, $Messages);
    		$$invalidate(2, message = '');
    	}

    	async function Numpy() {
    		if (!message) return;
    		var l = $Messages.length;
    		set_store_value(Messages, $Messages[l] = { id: 1, msg: message }, $Messages);
    		let res = null;
    		res = await fetch('https://numpy-chatbot.herokuapp.com/' + message, { method: 'POST' }).then(x => x.json());
    		while (!res) set_store_value(Messages, $Messages[l + 1] = { id: 0, msg: "...", link: 0 }, $Messages);
    		set_store_value(Messages, $Messages[l + 1] = { id: 0, msg: res.result, link: 1 }, $Messages);
    		$$invalidate(2, message = '');
    	}

    	async function Pandas() {
    		if (!message) return;
    		var l = $Messages.length;
    		set_store_value(Messages, $Messages[l] = { id: 1, msg: message }, $Messages);
    		let res = null;
    		res = await fetch('https://pandas-chatbot.herokuapp.com/' + message, { method: 'POST' }).then(x => x.json());
    		while (!res) set_store_value(Messages, $Messages[l + 1] = { id: 0, msg: "...", link: 0 }, $Messages);
    		set_store_value(Messages, $Messages[l + 1] = { id: 0, msg: res.result, link: 1 }, $Messages);
    		$$invalidate(2, message = '');
    	}

    	function handleKeydown(event) {
    		if (event.key === 'Enter') {
    			const text = event.target.value;
    			if (!text) return;
    			Text();
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Sidebar> was created with unknown prop '${key}'`);
    	});

    	function onwindowresize() {
    		$$invalidate(0, innerHeight = window.innerHeight);
    	}

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			div = $$value;
    			$$invalidate(1, div);
    		});
    	}

    	const click_handler = () => Numpy();
    	const click_handler_1 = () => Pandas();

    	function input_input_handler() {
    		message = this.value;
    		$$invalidate(2, message);
    	}

    	const click_handler_2 = () => Text();

    	$$self.$capture_state = () => ({
    		writable,
    		beforeUpdate,
    		afterUpdate,
    		innerHeight,
    		div,
    		autoscroll,
    		Messages,
    		message,
    		Text,
    		Numpy,
    		Pandas,
    		handleKeydown,
    		$Messages
    	});

    	$$self.$inject_state = $$props => {
    		if ('innerHeight' in $$props) $$invalidate(0, innerHeight = $$props.innerHeight);
    		if ('div' in $$props) $$invalidate(1, div = $$props.div);
    		if ('autoscroll' in $$props) autoscroll = $$props.autoscroll;
    		if ('Messages' in $$props) $$invalidate(4, Messages = $$props.Messages);
    		if ('message' in $$props) $$invalidate(2, message = $$props.message);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		innerHeight,
    		div,
    		message,
    		$Messages,
    		Messages,
    		Text,
    		Numpy,
    		Pandas,
    		handleKeydown,
    		onwindowresize,
    		div0_binding,
    		click_handler,
    		click_handler_1,
    		input_input_handler,
    		click_handler_2
    	];
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
