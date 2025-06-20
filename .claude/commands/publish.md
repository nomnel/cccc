# Publish to npm

Update the package version and publish to npm with proper git tagging.

## Usage
```
/publish <version>
```

## Steps

1. Run the prepublish script to ensure everything is ready:
   ```bash
   pnpm run prepublishOnly
   ```

2. Update the version in package.json to the version specified in $ARGUMENTS

3. Commit the version change:
   ```bash
   git add package.json
   git commit -m "chore: bump version to $ARGUMENTS"
   ```

4. Create a git tag for the new version:
   ```bash
   git tag v$ARGUMENTS
   ```

5. Publish the package to npm:
   ```bash
   npm publish
   ```

6. Push the commit and tag to the remote repository:
   ```bash
   git push && git push --tags
   ```

## Example
```
/publish 1.2.3
```

This will update the version to 1.2.3, commit the change, tag it as v1.2.3, publish to npm, and push everything to the remote repository.