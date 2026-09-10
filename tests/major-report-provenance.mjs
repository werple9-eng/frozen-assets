const validHash = (value) =>
  typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const sameSet = (a, b) =>
  Array.isArray(a) &&
  Array.isArray(b) &&
  a.length === new Set(a).size &&
  a.length === b.length &&
  a.every((value) => b.includes(value));

// A qualification documents a browser-QA-only change. It never changes the
// original run fingerprint or exempts an actual compiled simulation dependency.
export function qualifySimulationSource({
  source,
  qualification,
  actualRuntimeInputs,
  requiredSources,
  nonGameInputs,
  currentHashes,
}) {
  const issues = [];
  const permittedBrowserQa = [
    'lib/game/overhaul-qa.ts',
    'lib/game/webmcp.ts',
    'lib/game/motion-audit.ts',
  ];
  const original = source?.hashes ?? {};
  const differences = Object.keys(original).filter(
    (file) => original[file] !== currentHashes[file],
  );
  if (source?.status !== 'ready' || source?.compileInputsStable !== true)
    issues.push('The original build was not recorded as stable and ready');
  if (!qualification || qualification.builtAt !== source?.builtAt)
    issues.push('Qualification does not identify this original build');
  if (
    !sameSet(qualification?.entrypoints, [
      'lib/game/model.ts',
      'lib/game/tutorial-qa.ts',
    ]) ||
    !sameSet(qualification?.compiledRuntimeInputs, actualRuntimeInputs)
  )
    issues.push(
      'Qualification does not match the independently resolved graph',
    );
  if (qualification?.compiledRuntimeUnchanged !== true)
    issues.push('Qualification does not assert unchanged compiled runtime');
  if (
    !requiredSources.every((file) => validHash(original[file])) ||
    !Object.values(original).every(validHash)
  )
    issues.push(
      'Original source coverage is incomplete or contains invalid hashes',
    );
  if (
    ![...actualRuntimeInputs, ...nonGameInputs].every(
      (file) =>
        validHash(currentHashes[file]) &&
        original[file] === currentHashes[file],
    )
  )
    issues.push('An actual simulation dependency changed');
  if (
    !differences.every(
      (file) =>
        permittedBrowserQa.includes(file) &&
        !actualRuntimeInputs.includes(file),
    )
  )
    issues.push(
      'A source difference is outside the permitted browser-QA files',
    );
  const declared = qualification?.currentDifferences;
  if (
    !sameSet(
      declared?.map((difference) => difference.file),
      differences,
    ) ||
    !declared?.every(
      (difference) =>
        difference.inCompiledGameModelGraph === false &&
        difference.frozenHash === original[difference.file] &&
        difference.currentHash === currentHashes[difference.file],
    )
  )
    issues.push(
      'Declared differences do not match the original and current hashes',
    );
  return { accepted: issues.length === 0, issues, differences };
}
