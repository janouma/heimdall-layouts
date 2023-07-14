# Heimdall layouts
Development and hosting of heimdall add-ons

## Requirements
To be able to install and run this project, it is necessary to have access to `@heimdall` scoped private packages. To do so one must setup the `@heimdall:registry` npm config property:

```bash
npm config set @heimdall:registry <heimdall private registry url>
``` 

It is also mandatory to add a user having permissions to access the private repository:

```bash
npm adduser --registry=<heimdall private registry url> --scope=@heimdall
```

## Install

```bash
npm install
```

## Contributing

### Create a layout

```bash
npm run create:layout -- name=<layout name> [folder=<lower_snake_case_dirname>] [media=<media query>] [useDefaultHeader=<yes/no>]
```

The command above will create a new layout under `src`, or throw an error if one already exists with the same name. It also create a squeleton for the preview page `tests/suites/<layout>/main/views/index.html`, which allows you to test your layout.

#### Parameters

| Name | Description | Format | Default | Required |
| --- | --- | --- | --- | --- |
| layout <sup>(1)</sup> | The display name of the layout | string | - | yes |
| folder <sup>(2)</sup> | The name of the folder hosting the layout | string: lower snake case | `layout` (transformed to fit format if necessary) | no |
| media | A media query which conditions the display of the layout | string | - | no |
| useDefaultHeader | Whether the layout should use the default header or not | yes / no | no | no |

_**(1)** If not a valid folder name, transformed to a valid folder name, storing the raw value in a file named `layout.json`, at the root of the layout source folder._

_**(2)** Has no effect when identical to `layout`_

Any relevant optional value is stored in the `layout.json` file. Her is an example:

```json
{
  "folder": "watch_list",
  "name": "watch list",
  "useDefaultHeader": true
}
```

### Build a layout

```bash
npm run build:layout -- name=<layout name>
```

### Test a layout

To be able to test see a preview of your layout, the test server must be launch with the following command:

```bash
npm run start:test
```

To start the server in the background, use this command instead:

```bash
npm run startd:test
```

When the server is started in the background, the logs can be found under `server_test.log`

### Create a component

```bash
npm run create:component -- name=<layout name>/<component name>
```

The command above will create a new component under `src/<layout name>/components`, or throw an error if one already exists with the same name.

### Build a component

```bash
npm run build:component -- name=<layout name>/<component name>
```

### Watch a component

To ease the development process, it is possible to watch changes made to a component and reload it automatically. To do that one must start the development server first:

```bash
npm start
```

To start the server in the background, use this command instead:

```bash
npm run startd
```

Then start the watch process

```bash
npm run watch:component -- name=<layout name>/<component name>
```

### The `layoutContext` api

Special `body` and `header` components get injected a `layoutContext` property which provides a set of tools to interact with the host application – _heimdall_.

#### `actions`

<table>
  <thead>
    <tr>
      <th>Property</th>
      <th>Description</th>
      <th>Parameters</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>saveItem</td>
      <td>Add / update an item</td>
      <td>payload – Object</td>
    </tr>
    <tr>
      <td>removeItem</td>
      <td>Delete an item</td>
      <td>id – string</td>
    </tr>
    <tr>
      <td>getItemContent</td>
      <td>
        Return the content of an item
        <em>(the preview for an url or the snippet)</em>
      </td>
      <td>id – string</td>
    </tr>
    <tr>
      <td>findItems</td>
      <td>
        Trigger a search based on search paramaters <sup>(1)</sup>
      </td>
      <td>-</td>
    </tr>
    <tr>
      <td>countItems</td>
      <td>
        Trigger an items count based on search paramaters <sup>(1)</sup>
      </td>
      <td>-</td>
    </tr>
    <tr>
      <td>getTimeline</td>
      <td>
        Trigger a timeline fetch based on search paramaters <sup>(1)</sup>
      </td>
      <td>-</td>
    </tr>
    <tr>
      <td>updateSearchResults</td>
      <td>
        Trigger a search, an items count and a timeline fetch based on search paramaters <sup>(1)</sup>
      </td>
      <td>-</td>
    </tr>
    <tr>
      <td>getUnconnectedNeighbors</td>
      <td>
        Get unconnected users directly connected to authenticated user connections
      </td>
      <td>-</td>
    </tr>
  </tbody>
</table>

_[Refer to server api documentation for details](https://janouma.github.io/heimdall-layouts/doc/api)_

_**(1)** [see **state**👇🏾](#state)_

#### <a name="mutations">`mutations`</a>

<table>
  <thead>
    <tr>
      <th>Property</th>
      <th>Description</th>
      <th>Parameters</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>setModal</td>
      <td>Open a modal</td>
      <td>modal – Modal<sup>(1)</sup></td>
    </tr>
    <tr>
      <td>setSearchOffset</td>
      <td>Set search page</td>
      <td>offset – integer</td>
    </tr>
    <tr>
      <td>setSearchTags</td>
      <td>Set search tags filter</td>
      <td>tags – Array&lt;string&gt;</td>
    </tr>
    <tr>
      <td>setSearchConnectees</td>
      <td>Set search connectees filter</td>
      <td>connectees – Array&lt;string&gt;</td>
    </tr>
    <tr>
      <td>setSearchText</td>
      <td>Set search free text filter</td>
      <td>text – string</td>
    </tr>
    <tr>
      <td>setSearchWorkspace</td>
      <td>Set search workspace filter</td>
      <td>workspace – string</td>
    </tr>
    <tr>
      <td>setSearchIncludeDraft</td>
      <td>Whether to include draft items to search results</td>
      <td>include draft – boolean</td>
    </tr>
    <tr>
      <td>setSearch</td>
      <td>Set all search params at once</td>
      <td>search – Search<sup>(1)</sup></td>
    </tr>
  </tbody>
</table>

_[Refer to the state description details👇🏾](#state)_

_**(1)** [see **Types**👇🏾](#types)_

#### `computed`

| Property | Description | Format |
| --- | --- | --- |
| connected | Whether the user is authenticated | boolean |
| tagAliases | Aliases of the preset tags <sup>(1)</sup> | Array&lt;string&gt; |
| cleanSearch | Cleaned search params, stripped from falsy values | Search<sup>(2)</sup> |
| isSearchingWithTransition | Whether to show an animation on search start | boolean |

_**(1)** [see **state.tags**👇🏾](#state)_

_**(2)** [see **Types**👇🏾](#types)_

#### <a name="state">`state`</a>

| Property | Description | Format |
| --- | --- | --- |
| session | Authentication info | Sesstion<sup>(1)</sup> |
| webSocketOpen | Whether the web socket to the server is open | boolean |
| bookmarkletToken | The token used by the bookmarklet to add item _(Firefox)_ | string |
| modal | The current modal parameters | Modal<sup>(1)</sup> |
| tags | Preset tags | Array&lt;Tag<sup>(1)</sup>&gt; |
| workspaces | - | Array&lt;Tag<sup>(1)</sup>&gt; |
| items | Search results _(current page)_ | Array&lt;Item<sup>(1)</sup>&gt; |
| itemsCount | Search results count _(across all pages)_ | integer |
| search | Search parameters | Search<sup>(1)</sup> |
| searching | ongoing search | boolean |
| shouldSearchTransitionSkipped | Whether to show an animation on search completion | boolean |
| timeline | Search results timeline | Array&lt;integer<sup>(2)</sup>&gt; |
| connections | Immediate connectees | Array&lt;User<sup>(1)</sup>&gt; |
| highContrast | Whether the interface should have high contrast | boolean |
| isHighContrastPersisted | Whether the high setting is persisted – _meaning not derived from system preferences_ | boolean |
| layout | The currently displayed layout | string |
| availableLayouts | - | Array&lt;string&gt; |

_**(1)** [see **Types**👇🏾](#types)_

_**(2)** Timestamp_

#### `addGlobalEventListener`

Listen to event across the whole application

| Parameter | Format |
| --- | --- |
| Event name | string |
| Listener | function |

#### `dispatchGlobalEvent`

Send an event across the whole application

| Parameter | Format |
| --- | --- |
| Event name | string |

#### `removeGlobalEventListener`

Remove application level event listener

| Parameter | Format |
| --- | --- |
| Event name | string |
| Listener | function |

#### `sseClient`

<table>
  <thead>
    <tr>
      <th>Property</th>
      <th>Description</th>
      <th>Parameters</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>subscribe</td>
      <td>Add listener to server event</td>
      <td>
        path – string<br/>
        listener – function<br/>
        error logger – function
      </td>
    </tr>
    <tr>
      <td>unsubscribe</td>
      <td>Remove listener to server event</td>
      <td>
        path – string<br/>
        listener – function
      </td>
    </tr>
    <tr>
      <td>onConnect</td>
      <td>Add listener to connection event</td>
      <td>listener – function</td>
    </tr>
    <tr>
      <td>offConnect</td>
      <td>Remove listener to connection event</td>
      <td>listener – function</td>
    </tr>
    <tr>
      <td>onDisconnect</td>
      <td>Add listener to disconnection event</td>
      <td>listener – function</td>
    </tr>
    <tr>
      <td>offDisconnect</td>
      <td>Remove listener to disconnection event</td>
      <td>listener – function</td>
    </tr>
  </tbody>
</table>

#### `log`

The application log object _– of type [loglevel](https://github.com/pimterry/loglevel)_

### <a name="types">Types</a>

```typescript
type Modal = {
  component: string;
  type?: 'web-component';
  paramsHaveAccessors?: boolean; // whether `params` should be set through setters or attributes
  params?: Object; // each entry targets a prop of `component`
  onMount?: componentInstance => void; // a function to execute when `component` is mounted
  onBeforeDestroy?: componentInstance => void; // a function to execute before `component` is destroyed
}
```

```typescript
type Search = {
  offset?: integer;
  max?: integer;
  tags?: Array<string>,
  connectees?: Array<string>,
  text?: string,
  workspace?: string,
  includeDraft?: boolean;
}
```

```typescript
type Session = { user: User; }
```

```typescript
type User = {
  $id: string;
  username: string;
  created: integer; // timestamp
  pending: boolean;
  picture: string; // base 64 image data
  host: string; // user id
  scope: 'none'|'backup'|'regular'|'demo';
}
```

```typescript
type Tag = {
  name: string;
  preset: boolean;
  aliases: Array<string>;
  rank: integer;
}
```

```typescript
type Item = {
  $id: string;
  title: string;
  type: 'url'|'text'|'javascript'|'css'|'html'|'shell'|'python'|'json';
  url: string;
  icon: string;
  preview: boolean;
  snapshot: string;
  lastModified: integer; // timestamp
  keywords: Array<string>;
  owned: boolean;
  author: string;
  tags: Array<string>;
  workspaces: Array<string>;
}
```

### Test a component

```bash
npm run create:component-test -- name=<layout name>/<component name>
```

The command above will create a new component test suite under `tests/suites/<layout name>`, or throw an error if one already exists with the same name.

To run the test, use the following command:

```bash
npm test -- <layout name>/<component name>
```

## [Api documentation](https://janouma.github.io/heimdall-layouts/doc/api)
