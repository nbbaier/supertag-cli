---
title: "Input API"
description: "Tana Input API (addToNodeV2) allows users to POST basic data to a Tana workspace."
source: "https://tana.inc/docs/input-api"
---

## [Overview](https://tana.inc/docs/input-api#overview)

The Tana Input API gives you a set of basic tools to send (and edit, to a limited degree) data to the Tana graph. This API is useful for initializing data, automating repetitive tasks, and inputting data to Tana from custom workflows and external applications.

On the roadmap is to expand the API to enable reading from Tana graphs.

### [Restrictions](https://tana.inc/docs/input-api#restrictions)

The API has the following restrictions:

-   POST only
-   One call per second per token
-   A maximum of 100 nodes created per call
-   The payload size is limited to 5000 characters
-   ! Will not sync on workspaces with more than 750k nodes. If you are expecting to sync a lot of data, use a fresh workspace.

## [Basics](https://tana.inc/docs/input-api#basics)

The API can do the following:

-   **Create nodes:** Create nodes, including children
-   **Create fields:** Define new fields, their description, and their field type
-   **Create supertags:** Define supertags, and their template fields and nodes
-   **Edit nodes:** Update name of node.
-   **File uploads:** Upload files and associate them with specific nodes.

To access the API, you need:

-   A **Tana API token**
-   **Endpoint**: `https://europe-west1-tagr-prod.cloudfunctions.net/addToNodeV2`

## [Documentation](https://tana.inc/docs/input-api#documentation)

### [How to get a Tana API token](https://tana.inc/docs/input-api#how-to-get-a-tana-api-token)

You need an API token to work with the Input API. Tokens are assigned per workspace and can be generated in the Tana client:

1.  In the lower left corner of Tana, go `Settings` > `API Tokens`
2.  Select which workspace you want to create a token for, and click `Create token`
3.  Click `Copy` to copy the token you just created

### [nodeID](https://tana.inc/docs/input-api#node-id)

With Tana's Input API, you'll need to know how to retrieve the `nodeID` for a node. Everything is a node in Tana, and so, everything has a `nodeID`. Nodes, field definitions, supertags all have `nodeID`s. To retrieve the `nodeID` for different types of objects, use the command `Copy link` to get the URL, and grab the part after the `=` sign. Example:

-   URL: `https://app.tana.inc?nodeid=z-p8LdQk6I76`
-   nodeID: `z-p8LdQk6I76`

For supertags, you can retrieve the API Schema for the supertag template. Open the Supertag configuration panel, and in the title of the supertag run the command `Show API Schema`

### [JSON](https://tana.inc/docs/input-api#json)

The API is based on JSON. Below are examples of payloads for different situations:

### [Creating nodes](https://tana.inc/docs/input-api#creating-nodes)

Creating a node is done by sending a JSON object to the addToNoteV2 endpoint.

The object has two keys:

-   `targetNodeId` refers to where the nodes will be created. By default, nodes will be placed in the Library. Other targets include `SCHEMA`, `INBOX`, or any `nodeID`.
-   The `nodes` key is an array of one or more objects. These are Tana nodes.

When creating nodes, you can use the following keys:

-   `dataType` refers to what type of node it is. Valid values: `plain`, `field`, `url`, `date`, `reference`, `boolean`, `file`. Default is plain.
-   `name` refers to the name of the node.
    -   Cannot contain newlines
    -   Formatting available in nodes: `<b>bold</b>` `<i>italic</i>` `<del>striked</del>` `<mark>highlight</mark>` `**bold**` `__italic__` `~~striked~~` `^^highlight^^`
    -   You can also include links and dates:
        -   `<a href=“add-URL-here”>`
        -   `<span data-inlineref-node=“add-nodeID-here”>`
        -   `<span data-inlineref-date=“{”dateTimeString”:“add-date-here”}“>`
-   `description` refers to the description of the node
    -   Cannot contain newlines
-   `id` refers to a nodeID. Use when making a [reference node](https://tana.inc/docs/input-api#reference-node), or when [applying a supertag to a node](https://tana.inc/docs/input-api#plain-node-with-two-supertags).
-   `attributeId` refers to the field definition. Use when adding an existing field to a node.
-   `supertags` is used for creating supertags and fields, and also applying existing supertags to a node.
    -   To create a supertag, use `"supertags": [{"id": "SYS_T01"}]`
    -   To create a field, use `"supertags": [{"id": "SYS_T02"}]`
    -   To apply existing supertags to a node, use its `nodeID`.
        -   Get the nodeID of a supertag in Tana by going to the supertag config panel and use the command line `Show API schema`
    -   For more examples, see [Fields and Supertags](https://tana.inc/docs/input-api#fields-and-supertags) below.
-   `children` refers to the children to add to the node, including fields.

#### [Plain node](https://tana.inc/docs/input-api#plain-node)

An example of a plain node with text in the name, and in the description:

// Creating a plain node  
{  
  "nodes": \[  
    {  
      "name":"My plain node",  
      "description": "This is a plain node example."  
    }  
  \]  
}

#### [Plain node with a field](https://tana.inc/docs/input-api#plain-node-with-a-field)

An example of a plain node that contains an existing field and a field value in it:

// Creating a plain node with a field (existing) and value  
{  
  "nodes": \[  
    {  
      "name":"My plain node",  
      "children": \[  
        {  
          "type": "field",  
          "attributeId": "nodeID",  
          "children": \[  
             {  
               "name": "Field value"  
             }  
           \]  
        }  
      \]  
    }  
  \]  
}

#### [Plain node with two supertags](https://tana.inc/docs/input-api#plain-node-with-two-supertags)

An example of a plain node that has two different supertags applied, which will be created in the Inbox:

// add a node with two supertags, targeting Schema  
{  
  "targetNodeId": "INBOX",  
  "nodes": \[  
    {  
      "name": "The Hobbit",  
      "description": "A book by J.R.R. Tolkien",  
      "supertags": \[{"id": "nodeID-1"}, {"id": "nodeID-2"}\]  
    }  
  \]  
}

#### [Reference node](https://tana.inc/docs/input-api#reference-node)

An example of creating a reference, where you need to define the dataType as reference, and the nodeID:

// Creating a reference  
{  
  "nodes": \[  
    {  
      "dataType": "reference",  
      "id": "nodeID",

    }  
  \]  
}

#### [Date node](https://tana.inc/docs/input-api#date-node)

An example of creating a date node, where you need to define the dataType as date, and add the name in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format:

// Creating a date node  
{  
  "nodes": \[  
    {  
      "dataType": "date",  
      "name":"2023-12-01 08:00:00"  
    }  
  \]  
}

The API can receive different types of dates:

-   Day: `2024-01-01`
-   Week: `2024-W12`
-   Month: `2024-05`
-   Year: `2024`
-   Timestamp: `2024-01-01 00:00:00`
-   Ranges: `2024-01-01/2024-01-05`
-   All dates and times are sent as UTC. Timezone information is stripped.

#### [URL node](https://tana.inc/docs/input-api#url-node)

An example of creating a URL node (for EH review):

// Creating a node with a URL  
{  
  "nodes": \[  
    {  
      "name": "Webpage",  
      "description": "A webpage node with URL information",  
      "children": \[  
        {  
          "type": "field",  
          "attributeId": "URLFieldId",  
          "children": \[  
            {  
              "dataType": "url",  
              "name": "https://example.com",  
            }  
          \]  
        }  
      \]  
    }  
  \]  
}

#### [Checkbox node](https://tana.inc/docs/input-api#checkbox-node)

An example of creating a node with a checkbox (boolean state):

// Creating a checkbox node  
{  
  "nodes": \[  
    {  
      "dataType": "boolean",  
      "name":"My checkbox node",  
      "value": true,    // or false

    }  
  \]  
}

#### [Node with file attachment](https://tana.inc/docs/input-api#node-with-file-attachment)

// Creating a node with a file attached

{  
  "nodes": \[  
    {  
      "dataType": "file",  
      "file": "base64encodedfiledata...",  
      "filename": "myFile.pdf",  
      "contentType": "application/pdf",  
    }  
  \]  
}

Tana supports most MIME types in the `contentType` key. Tana will allow interactions with some common filetypes like images, audio, video and PDFs. Otherwise, a file will be uploaded as a plain attachment.

Note: The `file` key should contain the base64-encoded file data.

### [Creating fields and supertags](https://tana.inc/docs/input-api#creating-fields-and-supertags)

Creating fields and supertags follow a slightly different pattern. As a best practice, it is recommended to send these nodes to Schema.

#### [Creating fields](https://tana.inc/docs/input-api#creating-fields)

To create new fields, create a node with the supertag set to `SYS_T02`. You'll likely want to target the `SCHEMA`, which is a default place for supertag and field definitions to live.

{  
  "targetNodeId": "SCHEMA",  
  "nodes": \[  
    {  
      "name": "Author",  
      "description": "Who wrote the book?",  
      "supertags": \[{"id": "SYS\_T02"}\]  
    }  
  \]  
}

#### [Creating supertags](https://tana.inc/docs/input-api#creating-supertags)

To create a supertag, set the supertag value to `SYS_T01`:

{  
  targetNodeId: 'SCHEMA',  
  nodes: \[  
    {  
      name: 'Book',  
      description: 'A supertag for my books',  
      supertags: \[{id:'SYS\_T01'}\],  
    }  
  \]  
}  

#### [Using existing supertags](https://tana.inc/docs/input-api#using-existing-supertags)

Run the command line `Show API schema` on the title of the supertag in the config panel or on the supertag definition to get all the information you need on how to compile your JSON to properly enter information for existing supertags in the API.

A typical schema looks like this:

type Node = {  
  name: string;  
  description?: string;  
  supertags: \[{  
    /\* meeting \*/  
    id: 'MaaJRCypzJ'  
  }\];  
  children: \[  
    {  
      /\* Date \*/  
      type: 'field';  
      attributeId: 'iKQAQN38Vx';  
      children: \[{  
        dataType: 'date';  
        name: string;  
      }\];  
    },  
  \];  
};  

And comes with a payload example:

{  
  "nodes": \[  
    {  
      "name": "New node",  
      "supertags": \[  
        {  
          "id": "MaaJRCypzJ"  
        }  
      \],  
      "children": \[  
        {  
          "type": "field",  
          "attributeId": "iKQAQN38Vx",  
          "children": \[  
            {  
              "dataType": "date",  
              "name": "2023-05-10T08:25:59.059Z"  
            }  
          \]  
        },  
        {  
          "name": "Child node"  
        }  
      \]  
    }  
  \]  
}  

Use the payload example to properly compile the JSON for the Tana API.

### [Editing the name of a node](https://tana.inc/docs/input-api#editing-the-name-of-a-node)

The name of a node can be changed.  
Replace `nodes` in the payload with `setName: 'new name'` like this:

{  
  targetNodeId:'xxx',  
  setName: 'hello',  
}

### [Current limitations](https://tana.inc/docs/input-api#current-limitations)

Rate limiting:

-   One call per second per token
-   Max 100 nodes created per call
-   Max 5000 chars in one request

Other limitations:

-   You cannot target a relative Today-node
-   To add supertags/fields, you’ll have to know the IDs of the Supertag. To get it, run the command “Show API schema” on a supertag
-   The payload is currently capped at 5K. Let us know if this is too low (and why)
-   There’s a new endpoint for the updated API
-   You cannot send a checkbox as a child to a normal node
-   We don’t support the initialization function
-   We don’t support child templates
-   We do not support non http/https links (in-app links)
-   The API will only sync to workspaces under 750k nodes
-   On added/removed events for nodes and supertags are not triggered

## [TanaAPIHelper](https://tana.inc/docs/input-api#tana-api-helper)

In the GitHub repository is a basic client for Tana's Input API and example scripts. For instructions on how to use that, go to the [Github repository](https://github.com/tanainc/tana-input-api-samples/tree/main) and look at the readme.
