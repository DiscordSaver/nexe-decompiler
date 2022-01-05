# nexe-decompiler
A decompiler for nexe

# Installation
`npm install`

# Usage
To extract all Javascript including the node_modules run
```
node decompile.js project.exe
```

To extract all Javascript without the node_modules run
```
node decompile.js project.exe --ignore-node-modules
```
