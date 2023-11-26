import{SvelteElement,append,attr,attribute_to_object,binding_callbacks,detach,element,empty,flush,init,insert,listen,noop,not_equal,set_data,space,stop_propagation,svg_element,text}from"../../packages/svelte/internal/index.mjs";import{onDestroy}from"../../packages/svelte/internal/index.mjs";import displayUsername from"../../node_modules/@heimdall/shared-lib/lib/username_display.js";function create_if_block_2(e){let t;return{c(){t=text(e[5])},m(e,r){insert(e,t,r)},p(e,r){32&r&&set_data(t,e[5])},d(e){e&&detach(t)}}}function create_if_block_1(e){let t,r,i,n,a,o,s,d,l,c,m,p;return{c(){t=svg_element("svg"),r=svg_element("svg"),i=svg_element("circle"),n=svg_element("clipPath"),a=svg_element("circle"),o=svg_element("g"),s=svg_element("g"),d=svg_element("path"),l=space(),c=element("button"),c.innerHTML='<svg class="stretch"><use href="#delete-icon"></use></svg>',attr(i,"cx","5.437"),attr(i,"cy","5.437"),attr(i,"r","5.138"),attr(a,"cx","5.437"),attr(a,"cy","5.437"),attr(a,"r","5.138"),attr(n,"id","a"),attr(d,"d","M3.377 3.377l4.11 4.11M3.377 7.487l4.11-4.11"),attr(s,"fill","none"),attr(s,"stroke","#222038"),attr(s,"stroke-width","1.13"),attr(o,"clip-path","url(#a)"),attr(r,"id","delete-icon"),attr(r,"viewBox","0 0 11 11"),attr(r,"fill-rule","evenodd"),attr(r,"clip-rule","evenodd"),attr(r,"stroke-linecap","round"),attr(r,"stroke-linejoin","round"),attr(r,"stroke-miterlimit","1.5"),attr(t,"class","display-none"),attr(t,"xmlns","http://www.w3.org/2000/svg"),attr(c,"class","delete btn absolute circle border br-deepspace border-box not-visible animated")},m(h,u){insert(h,t,u),append(t,r),append(r,i),append(r,n),append(n,a),append(r,o),append(o,s),append(s,d),insert(h,l,u),insert(h,c,u),m||(p=listen(c,"click",stop_propagation(e[8])),m=!0)},p:noop,d(e){e&&detach(t),e&&detach(l),e&&detach(c),m=!1,p()}}}function create_if_block(e){let t,r;return{c(){t=element("span"),r=text(e[4]),attr(t,"class","name")},m(e,i){insert(e,t,i),append(t,r)},p(e,t){16&t&&set_data(r,e[4])},d(e){e&&detach(t)}}}function create_fragment(e){let t,r,i,n,a=!e[3]?.picture&&create_if_block_2(e),o=!e[1]&&create_if_block_1(e),s=e[0]&&create_if_block(e);return{c(){t=element("div"),a&&a.c(),r=space(),o&&o.c(),i=space(),s&&s.c(),n=empty(),this.c=noop,attr(t,"class","picture border-box circle border flex justify-center items-center"),attr(t,"title",e[7]),attr(t,"style",e[6])},m(d,l){insert(d,t,l),a&&a.m(t,null),e[12](t),insert(d,r,l),o&&o.m(d,l),insert(d,i,l),s&&s.m(d,l),insert(d,n,l)},p(e,[r]){e[3]?.picture?a&&(a.d(1),a=null):a?a.p(e,r):(a=create_if_block_2(e),a.c(),a.m(t,null)),128&r&&attr(t,"title",e[7]),64&r&&attr(t,"style",e[6]),e[1]?o&&(o.d(1),o=null):o?o.p(e,r):(o=create_if_block_1(e),o.c(),o.m(i.parentNode,i)),e[0]?s?s.p(e,r):(s=create_if_block(e),s.c(),s.m(n.parentNode,n)):s&&(s.d(1),s=null)},i:noop,o:noop,d(d){d&&detach(t),a&&a.d(),e[12](null),d&&detach(r),o&&o.d(d),d&&detach(i),s&&s.d(d),d&&detach(n)}}}function instance(e,t,r){let i,n,a,o,s,d,l,{showname:c=!1}=t,{anonymized:m=!1}=t,{readonly:p=!1}=t,{user:h}=t;function u(){b("select")}function b(e){const t=new window.CustomEvent(e,{detail:n?.$id,bubbles:!1});i?.dispatchEvent(t)}return onDestroy((()=>i?.removeEventListener("click",u))),e.$$set=e=>{"showname"in e&&r(0,c=e.showname),"anonymized"in e&&r(9,m=e.anonymized),"readonly"in e&&r(1,p=e.readonly),"user"in e&&r(10,h=e.user)},e.$$.update=()=>{if(4&e.$$.dirty&&r(11,i=l?.parentNode.host),1024&e.$$.dirty&&r(3,n=h&&JSON.parse(h)),520&e.$$.dirty&&r(4,a=n&&(m?displayUsername(n.username):n.username)),17&e.$$.dirty&&r(7,o=c?void 0:a),2048&e.$$.dirty&&i?.addEventListener("click",u),8&e.$$.dirty&&n){const[[e],[t]]=n.username.split(/\W/);r(5,s=`${e}${t}`);const{picture:i}=n;r(6,d=i&&`background-image:url(${i})`)}},[c,p,l,n,a,s,d,o,function(){b("remove")},m,h,i,function(e){binding_callbacks[e?"unshift":"push"]((()=>{l=e,r(2,l)}))}]}class User_tag extends SvelteElement{constructor(e){super();const t=document.createElement("style");t.textContent=".border-box{box-sizing:border-box}@media(min-width:40em){}@media(min-width:52em){}@media(min-width:64em){}.flex{display:flex}@media(min-width:40em){}@media(min-width:52em){}@media(min-width:64em){}.items-center{align-items:center}.justify-center{justify-content:center}.absolute{position:absolute}.border{border-style:solid;border-width:1px;border-width:var(--border-width)}.circle{border-radius:50%}@media(max-width:40em){}@media(min-width:40em) and (max-width:52em){}@media(min-width:52em) and (max-width:64em){}@media(min-width:64em){}.display-none{display:none!important}.btn{font-family:inherit;font-size:inherit;font-weight:bold;text-decoration:none;cursor:pointer;display:inline-block;line-height:1.125rem;padding:.5rem 1rem;margin:0;height:auto;border:1px solid transparent;vertical-align:middle;-webkit-appearance:none;color:inherit;background-color:transparent}.btn:hover{text-decoration:none}.btn:focus{outline:none;border-color:rgba(0, 0, 0, .125);box-shadow:0 0 0 3px rgba(0, 0, 0, .25)}::-moz-focus-inner{border:0;padding:0}:host{--anim-duration:0.25s}:where(.animated){transition-duration:var(--anim-duration);transition-timing-function:ease-in-out;transition-property:color, background-color, opacity, visibility, height, width, transform, \n    transform-origin, filter, left, top, right, no-prop}.br-deepspace{border-color:rgb(6,3,33);border-color:rgb(var(--deepspace))}.not-visible{visibility:hidden;opacity:0}:host .stretch{width:100%}:host .stretch{height:100%}:host{box-sizing:border-box;position:relative;font-weight:bold;display:flex;align-items:center;transition-duration:var(--anim-duration);transition-timing-function:ease-in-out;transition-property:color, background-color, opacity, visibility, height, width, transform, \n    transform-origin, filter, left, top, right, no-prop\n  }:host(:not([readonly]):hover) .delete{visibility:visible;opacity:1}:host-context(.high-contrast) :is(.picture){filter:invert(100%) brightness(75%)}:host-context(.high-contrast)::after{filter:invert(100%)}.picture{--pict-size:1.93em;--border-width:0.14em;width:var(--pict-size);height:var(--pict-size);background-size:cover;background-repeat:no-repeat;background-color:rgba(255,255,255,0.12);background-color:var(--transluent);border-color:currentColor;border-width:var(--border-width);text-transform:uppercase;box-shadow:inset 0 0 0 calc(var(--border-width) / 2 + 1px) rgb(6,3,33);box-shadow:inset 0 0 0 calc(var(--border-width) / 2 + 1px) rgb(var(--deepspace))}.delete{--size:1.34em;display:flex;padding:0;margin:0;width:var(--size);height:var(--size);left:0.68em;top:0.28em;transform:translate(50%, -50%);cursor:pointer\n  }.delete>svg{fill:currentColor}.delete::before{--size:100%;--expanse:50%;content:'';position:absolute;width:var(--size);height:var(--size);top:0;left:0;border-radius:50%;margin:calc(-1 * var(--expanse));padding:var(--expanse)}@media(pointer: fine){.delete{--size:0.92em\n  }}.name{margin-left:0.5em;letter-spacing:0.05em}",this.shadowRoot.appendChild(t),init(this,{target:this.shadowRoot,props:attribute_to_object(this.attributes),customElement:!0},instance,create_fragment,not_equal,{showname:0,anonymized:9,readonly:1,user:10},null),e&&(e.target&&insert(e.target,this,e.anchor),e.props&&(this.$set(e.props),flush()))}static get observedAttributes(){return["showname","anonymized","readonly","user"]}get showname(){return this.$$.ctx[0]}set showname(e){this.$$set({showname:e}),flush()}get anonymized(){return this.$$.ctx[9]}set anonymized(e){this.$$set({anonymized:e}),flush()}get readonly(){return this.$$.ctx[1]}set readonly(e){this.$$set({readonly:e}),flush()}get user(){return this.$$.ctx[10]}set user(e){this.$$set({user:e}),flush()}}customElements.define("user-tag",User_tag);export default User_tag;