# Slack Testpilots

I have written a CLI tool for Tana that bridges the gap of the missing Read API and might be of interest to some of you. Here's the short description:
can automatically download the JSON export from Tana, parse it and store it in a local database
allows you to query the database (fulltext search or by tags - can probably be extended to other search criteria)
Parses the complete Tag structure of your tana workspace and allows you to query / export nodes by tag (and exports JSON or Tans Paste)
uses the Input API to create nodes with any supertag from your workspace (and knows about the fields of the supertag)
Has a built in web server so that you can query it from Tana Commands.

You can read the user guide here: https://store.invisible.ch/tana/guide. (The rest of the website is pretty much WIP, don't take anything to serious yet)

This is useful for a lot of automation use cases. I currently have a "runs on my machine" version and I would like to get some feedback from those who think this is a valuable addition to your toolbelt. I am pondering making this available commercially, let me know your thoughts. (I saw that Tom Haus has been creating something along the same direction as OpenSource - I'm not totally against Open Sourcing, but I am considering to shift some of my time from my day job to other work, so I am also starting to experiment with other incomes)

DM me so that I can send the download links to you (and later a quick survey over your feedback)