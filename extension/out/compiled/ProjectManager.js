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
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
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

    /* webviews\components\ProjectManager\login.svelte generated by Svelte v3.47.0 */

    const { console: console_1 } = globals;
    const file$1 = "webviews\\components\\ProjectManager\\login.svelte";

    function create_fragment$1(ctx) {
    	let section;
    	let div11;
    	let div10;
    	let div9;
    	let div8;
    	let div7;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div6;
    	let div5;
    	let form;
    	let div1;
    	let i;
    	let t1;
    	let span;
    	let t3;
    	let h5;
    	let t5;
    	let div2;
    	let input0;
    	let t6;
    	let label0;
    	let t8;
    	let div3;
    	let input1;
    	let t9;
    	let label1;
    	let t11;
    	let div4;
    	let button;
    	let t13;
    	let a0;
    	let t15;
    	let p;
    	let t16;
    	let a1;
    	let t18;
    	let a2;
    	let t20;
    	let a3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div11 = element("div");
    			div10 = element("div");
    			div9 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div6 = element("div");
    			div5 = element("div");
    			form = element("form");
    			div1 = element("div");
    			i = element("i");
    			t1 = space();
    			span = element("span");
    			span.textContent = "Logo";
    			t3 = space();
    			h5 = element("h5");
    			h5.textContent = "Sign into your account";
    			t5 = space();
    			div2 = element("div");
    			input0 = element("input");
    			t6 = space();
    			label0 = element("label");
    			label0.textContent = "Email address";
    			t8 = space();
    			div3 = element("div");
    			input1 = element("input");
    			t9 = space();
    			label1 = element("label");
    			label1.textContent = "Password";
    			t11 = space();
    			div4 = element("div");
    			button = element("button");
    			button.textContent = "Login";
    			t13 = space();
    			a0 = element("a");
    			a0.textContent = "Forgot password?";
    			t15 = space();
    			p = element("p");
    			t16 = text("Don't have an account? ");
    			a1 = element("a");
    			a1.textContent = "Register here";
    			t18 = space();
    			a2 = element("a");
    			a2.textContent = "Terms of use.";
    			t20 = space();
    			a3 = element("a");
    			a3.textContent = "Privacy policy";
    			if (!src_url_equal(img.src, img_src_value = "https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-login-form/img1.webp")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "login form");
    			attr_dev(img, "class", "img-fluid");
    			set_style(img, "border-radius", "1rem 0 0 1rem");
    			add_location(img, file$1, 34, 14, 873);
    			attr_dev(div0, "class", "col-md-6 col-lg-5 d-none d-md-block");
    			add_location(div0, file$1, 33, 12, 808);
    			attr_dev(i, "class", "fas fa-cubes fa-2x me-3");
    			set_style(i, "color", "#ff6219");
    			add_location(i, file$1, 43, 20, 1328);
    			attr_dev(span, "class", "h1 fw-bold mb-0");
    			add_location(span, file$1, 44, 20, 1413);
    			attr_dev(div1, "class", "d-flex align-items-center mb-3 pb-1");
    			add_location(div1, file$1, 42, 18, 1257);
    			attr_dev(h5, "class", "fw-normal mb-3 pb-3");
    			set_style(h5, "letter-spacing", "1px");
    			add_location(h5, file$1, 47, 18, 1502);
    			attr_dev(input0, "type", "email");
    			attr_dev(input0, "id", "form2Example17");
    			attr_dev(input0, "class", "form-control form-control-lg");
    			add_location(input0, file$1, 50, 20, 1665);
    			attr_dev(label0, "class", "form-label");
    			attr_dev(label0, "for", "form2Example17");
    			add_location(label0, file$1, 51, 20, 1785);
    			attr_dev(div2, "class", "form-outline mb-4");
    			add_location(div2, file$1, 49, 18, 1612);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "id", "form2Example27");
    			attr_dev(input1, "class", "form-control form-control-lg");
    			add_location(input1, file$1, 55, 20, 1954);
    			attr_dev(label1, "class", "form-label");
    			attr_dev(label1, "for", "form2Example27");
    			add_location(label1, file$1, 56, 20, 2079);
    			attr_dev(div3, "class", "form-outline mb-4");
    			add_location(div3, file$1, 54, 18, 1901);
    			attr_dev(button, "class", "btn btn-dark btn-lg btn-block");
    			attr_dev(button, "type", "button");
    			add_location(button, file$1, 60, 20, 2235);
    			attr_dev(div4, "class", "pt-1 mb-4");
    			add_location(div4, file$1, 59, 18, 2190);
    			attr_dev(a0, "class", "small text-muted");
    			attr_dev(a0, "href", "#!");
    			add_location(a0, file$1, 63, 18, 2381);
    			attr_dev(a1, "href", "#!");
    			set_style(a1, "color", "#393f81");
    			add_location(a1, file$1, 64, 89, 2530);
    			attr_dev(p, "class", "mb-5 pb-lg-2");
    			set_style(p, "color", "#393f81");
    			add_location(p, file$1, 64, 18, 2459);
    			attr_dev(a2, "href", "#!");
    			attr_dev(a2, "class", "small text-muted");
    			add_location(a2, file$1, 66, 18, 2631);
    			attr_dev(a3, "href", "#!");
    			attr_dev(a3, "class", "small text-muted");
    			add_location(a3, file$1, 67, 18, 2706);
    			add_location(form, file$1, 40, 16, 1229);
    			attr_dev(div5, "class", "card-body p-4 p-lg-5 text-black");
    			add_location(div5, file$1, 38, 14, 1164);
    			attr_dev(div6, "class", "col-md-6 col-lg-7 d-flex align-items-center");
    			add_location(div6, file$1, 37, 12, 1091);
    			attr_dev(div7, "class", "row g-0");
    			add_location(div7, file$1, 32, 10, 773);
    			attr_dev(div8, "class", "card");
    			set_style(div8, "border-radius", "1rem");
    			add_location(div8, file$1, 31, 8, 714);
    			attr_dev(div9, "class", "col col-xl-10");
    			add_location(div9, file$1, 30, 6, 677);
    			attr_dev(div10, "class", "row d-flex justify-content-center align-items-center h-100");
    			add_location(div10, file$1, 29, 4, 597);
    			attr_dev(div11, "class", "container py-5 h-100");
    			add_location(div11, file$1, 28, 2, 557);
    			attr_dev(section, "class", "vh-100");
    			set_style(section, "background-color", "#9A616D");
    			add_location(section, file$1, 27, 0, 494);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div0);
    			append_dev(div0, img);
    			append_dev(div7, t0);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, form);
    			append_dev(form, div1);
    			append_dev(div1, i);
    			append_dev(div1, t1);
    			append_dev(div1, span);
    			append_dev(form, t3);
    			append_dev(form, h5);
    			append_dev(form, t5);
    			append_dev(form, div2);
    			append_dev(div2, input0);
    			set_input_value(input0, /*email*/ ctx[0]);
    			append_dev(div2, t6);
    			append_dev(div2, label0);
    			append_dev(form, t8);
    			append_dev(form, div3);
    			append_dev(div3, input1);
    			set_input_value(input1, /*password*/ ctx[1]);
    			append_dev(div3, t9);
    			append_dev(div3, label1);
    			append_dev(form, t11);
    			append_dev(form, div4);
    			append_dev(div4, button);
    			append_dev(form, t13);
    			append_dev(form, a0);
    			append_dev(form, t15);
    			append_dev(form, p);
    			append_dev(p, t16);
    			append_dev(p, a1);
    			append_dev(form, t18);
    			append_dev(form, a2);
    			append_dev(form, t20);
    			append_dev(form, a3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[3]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[4]),
    					listen_dev(button, "click", /*click_handler*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*email*/ 1 && input0.value !== /*email*/ ctx[0]) {
    				set_input_value(input0, /*email*/ ctx[0]);
    			}

    			if (dirty & /*password*/ 2 && input1.value !== /*password*/ ctx[1]) {
    				set_input_value(input1, /*password*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Login', slots, []);
    	let email = '';
    	let password = '';
    	let result = null;

    	const config = {
    		header: { "Content-Type": "application/json" }
    	};

    	async function Login() {
    		const res = await fetch('http://localhost:5000/api/auth/login', {
    			method: 'POST',
    			mode: 'no-cors',
    			body: { email, password },
    			config
    		});

    		const json = await res.json();
    		result = JSON.stringify(json);
    		console.log(result);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Login> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		email = this.value;
    		$$invalidate(0, email);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate(1, password);
    	}

    	const click_handler = () => Login();
    	$$self.$capture_state = () => ({ email, password, result, config, Login });

    	$$self.$inject_state = $$props => {
    		if ('email' in $$props) $$invalidate(0, email = $$props.email);
    		if ('password' in $$props) $$invalidate(1, password = $$props.password);
    		if ('result' in $$props) result = $$props.result;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		email,
    		password,
    		Login,
    		input0_input_handler,
    		input1_input_handler,
    		click_handler
    	];
    }

    class Login_1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Login_1",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* webviews\components\ProjectManager.svelte generated by Svelte v3.47.0 */
    const file = "webviews\\components\\ProjectManager.svelte";

    function create_fragment(ctx) {
    	let link;
    	let script;
    	let script_src_value;
    	let t;
    	let login;
    	let current;
    	login = new Login_1({ $$inline: true });

    	const block = {
    		c: function create() {
    			link = element("link");
    			script = element("script");
    			t = space();
    			create_component(login.$$.fragment);
    			attr_dev(link, "href", "https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css");
    			attr_dev(link, "rel", "stylesheet");
    			attr_dev(link, "integrity", "sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3");
    			attr_dev(link, "crossorigin", "anonymous");
    			add_location(link, file, 8, 4, 128);
    			if (!src_url_equal(script.src, script_src_value = "https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js")) attr_dev(script, "src", script_src_value);
    			attr_dev(script, "integrity", "sha384-ka7Sk0Gln4gmtz2MlQnikT1wXgYsOg+OMhuP+IlRH9sENBO0LRn5q+8nbTov4+1p");
    			attr_dev(script, "crossorigin", "anonymous");
    			add_location(script, file, 9, 4, 344);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, link);
    			append_dev(document.head, script);
    			insert_dev(target, t, anchor);
    			mount_component(login, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(login.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(login.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			detach_dev(link);
    			detach_dev(script);
    			if (detaching) detach_dev(t);
    			destroy_component(login, detaching);
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ProjectManager', slots, []);
    	let logged = false;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ProjectManager> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ logged, Login: Login_1 });

    	$$self.$inject_state = $$props => {
    		if ('logged' in $$props) logged = $$props.logged;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [];
    }

    class ProjectManager extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProjectManager",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new ProjectManager({
        target: document.body,
    });

    return app;

})();
//# sourceMappingURL=ProjectManager.js.map
