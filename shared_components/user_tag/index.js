import{SvelteElement,append,attr,attribute_to_object,binding_callbacks,detach,element,empty,flush,init,insert,listen,noop,not_equal,set_data,space,stop_propagation,svg_element,text}from"../../packages/svelte/internal/index.mjs";import{onDestroy}from"../../packages/svelte/internal/index.mjs";import displayUsername from"../../node_modules/@heimdall/shared-lib/lib/username_display.js";function create_if_block_2(e){let t;return{c(){t=text(e[5])},m(e,i){insert(e,t,i)},p(e,i){32&i&&set_data(t,e[5])},d(e){e&&detach(t)}}}function create_if_block_1(e){let t,i,r,n,o,a;return{c(){t=element("button"),i=svg_element("svg"),r=svg_element("use"),attr(r,"href",n=deleteIconPath+"#icon"),attr(i,"class","stretch"),attr(t,"class","delete btn absolute circle border br-deepspace border-box not-visible animated")},m(n,s){insert(n,t,s),append(t,i),append(i,r),o||(a=listen(t,"click",stop_propagation(e[8])),o=!0)},p:noop,d(e){e&&detach(t),o=!1,a()}}}function create_if_block(e){let t,i;return{c(){t=element("span"),i=text(e[4]),attr(t,"class","name")},m(e,r){insert(e,t,r),append(t,i)},p(e,t){16&t&&set_data(i,e[4])},d(e){e&&detach(t)}}}function create_fragment(e){let t,i,r,n,o=!e[3]?.picture&&create_if_block_2(e),a=!e[1]&&create_if_block_1(e),s=e[0]&&create_if_block(e);return{c(){t=element("div"),o&&o.c(),i=space(),a&&a.c(),r=space(),s&&s.c(),n=empty(),this.c=noop,attr(t,"class","picture border-box circle border flex justify-center items-center"),attr(t,"title",e[7]),attr(t,"style",e[6])},m(d,l){insert(d,t,l),o&&o.m(t,null),e[12](t),insert(d,i,l),a&&a.m(d,l),insert(d,r,l),s&&s.m(d,l),insert(d,n,l)},p(e,[i]){e[3]?.picture?o&&(o.d(1),o=null):o?o.p(e,i):(o=create_if_block_2(e),o.c(),o.m(t,null)),128&i&&attr(t,"title",e[7]),64&i&&attr(t,"style",e[6]),e[1]?a&&(a.d(1),a=null):a?a.p(e,i):(a=create_if_block_1(e),a.c(),a.m(r.parentNode,r)),e[0]?s?s.p(e,i):(s=create_if_block(e),s.c(),s.m(n.parentNode,n)):s&&(s.d(1),s=null)},i:noop,o:noop,d(d){d&&detach(t),o&&o.d(),e[12](null),d&&detach(i),a&&a.d(d),d&&detach(r),s&&s.d(d),d&&detach(n)}}}const deleteIconPath="https:/janouma.github.io/heimdall-layouts/shared_components/user_tag/assets/images/detete-tag-icon.svg";function instance(e,t,i){let r,n,o,a,s,d,l,{showname:c=!1}=t,{anonymized:m=!1}=t,{readonly:h=!1}=t,{user:p}=t;function u(){b("select")}function b(e){const t=new window.CustomEvent(e,{detail:n?.$id,bubbles:!1});r?.dispatchEvent(t)}return onDestroy((()=>r?.removeEventListener("click",u))),e.$$set=e=>{"showname"in e&&i(0,c=e.showname),"anonymized"in e&&i(9,m=e.anonymized),"readonly"in e&&i(1,h=e.readonly),"user"in e&&i(10,p=e.user)},e.$$.update=()=>{if(4&e.$$.dirty&&i(11,r=l?.parentNode.host),1024&e.$$.dirty&&i(3,n=p&&JSON.parse(p)),520&e.$$.dirty&&i(4,o=n&&(m?displayUsername(n.username):n.username)),17&e.$$.dirty&&i(7,a=c?void 0:o),2048&e.$$.dirty&&r?.addEventListener("click",u),8&e.$$.dirty&&n){const[[e],[t]]=n.username.split(/\W/);i(5,s=`${e}${t}`);const{picture:r}=n;i(6,d=r&&`background-image:url(${r})`)}},[c,h,l,n,o,s,d,a,function(){b("remove")},m,p,r,function(e){binding_callbacks[e?"unshift":"push"]((()=>{l=e,i(2,l)}))}]}class User_tag extends SvelteElement{constructor(e){super();const t=document.createElement("style");t.textContent=".border-box{box-sizing:border-box}@media(min-width:40em){}@media(min-width:52em){}@media(min-width:64em){}.flex{display:flex}@media(min-width:40em){}@media(min-width:52em){}@media(min-width:64em){}.items-center{align-items:center}.justify-center{justify-content:center}.absolute{position:absolute}.border{border-style:solid;border-width:1px;border-width:var(--border-width)}.circle{border-radius:50%}@media(max-width:40em){}@media(min-width:40em) and (max-width:52em){}@media(min-width:52em) and (max-width:64em){}@media(min-width:64em){}.btn{font-family:inherit;font-size:inherit;font-weight:bold;text-decoration:none;cursor:pointer;display:inline-block;line-height:1.125rem;padding:.5rem 1rem;margin:0;height:auto;border:1px solid transparent;vertical-align:middle;-webkit-appearance:none;color:inherit;background-color:transparent}.btn:hover{text-decoration:none}.btn:focus{outline:none;border-color:rgba(0, 0, 0, .125);box-shadow:0 0 0 3px rgba(0, 0, 0, .25)}::-moz-focus-inner{border:0;padding:0}:host{--anim-duration:0.25s}:where(.animated){transition-duration:var(--anim-duration);transition-timing-function:ease-in-out;transition-property:color, background-color, opacity, visibility, height, width, transform, \n    transform-origin, filter, left, top, right, no-prop}.br-deepspace{border-color:rgb(6,3,33);border-color:rgb(var(--deepspace))}.not-visible{visibility:hidden;opacity:0}:host .stretch{width:100%}:host .stretch{height:100%}:host{box-sizing:border-box;position:relative;font-weight:bold;display:flex;align-items:center;transition-duration:var(--anim-duration);transition-timing-function:ease-in-out;transition-property:color, background-color, opacity, visibility, height, width, transform, \n    transform-origin, filter, left, top, right, no-prop\n  }:host(:not([readonly]):hover) .delete{visibility:visible;opacity:1}:host-context(.high-contrast) :is(.picture){filter:invert(100%) brightness(75%)}:host-context(.high-contrast)::after{filter:invert(100%)}.picture{--pict-size:1.93em;--border-width:0.14em;width:var(--pict-size);height:var(--pict-size);background-size:cover;background-repeat:no-repeat;background-color:rgba(255,255,255,0.12);background-color:var(--transluent);border-color:currentColor;border-width:var(--border-width);text-transform:uppercase;box-shadow:inset 0 0 0 calc(var(--border-width) / 2 + 1px) rgb(6,3,33);box-shadow:inset 0 0 0 calc(var(--border-width) / 2 + 1px) rgb(var(--deepspace))}.delete{--size:1.34em;display:flex;padding:0;margin:0;width:var(--size);height:var(--size);left:0.68em;top:0.28em;transform:translate(50%, -50%);cursor:pointer\n  }.delete>svg{fill:currentColor}.delete::before{--size:100%;--expanse:50%;content:'';position:absolute;width:var(--size);height:var(--size);top:0;left:0;border-radius:50%;margin:calc(-1 * var(--expanse));padding:var(--expanse)}@media(pointer: fine){.delete{--size:0.92em\n  }}.name{margin-left:0.5em;letter-spacing:0.05em}",this.shadowRoot.appendChild(t),init(this,{target:this.shadowRoot,props:attribute_to_object(this.attributes),customElement:!0},instance,create_fragment,not_equal,{showname:0,anonymized:9,readonly:1,user:10},null),e&&(e.target&&insert(e.target,this,e.anchor),e.props&&(this.$set(e.props),flush()))}static get observedAttributes(){return["showname","anonymized","readonly","user"]}get showname(){return this.$$.ctx[0]}set showname(e){this.$$set({showname:e}),flush()}get anonymized(){return this.$$.ctx[9]}set anonymized(e){this.$$set({anonymized:e}),flush()}get readonly(){return this.$$.ctx[1]}set readonly(e){this.$$set({readonly:e}),flush()}get user(){return this.$$.ctx[10]}set user(e){this.$$set({user:e}),flush()}}customElements.define("user-tag",User_tag);export default User_tag;