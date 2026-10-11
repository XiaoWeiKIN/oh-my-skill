"""Non-visual structural checks. They cannot verify rendering or scientific accuracy."""
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[1]
required = [
    'SKILL.md', 'references/visual-router.md', 'references/global-style.md',
    'references/prompt-template.md', 'references/quality-checklist.md',
    'references/evidence-gate.md', 'references/edit-preservation.md',
    'references/data-infographic.md', 'references/editorial-infographic.md',
    'references/editorial-data-graphic.md', 'agents/openai.yaml',
    'tests/regression-cases.md',
]
for path in required:
    assert (ROOT/path).is_file(), f'Missing file: {path}'

skill = (ROOT/'SKILL.md').read_text(encoding='utf-8')
assert skill.startswith('---\n') and '\nname: economist-visual\n' in skill
assert 'Editorial Infographic' in skill and 'Editorial Data Graphic' in skill
assert 'Evidence Manifest' in skill
assert '禁遮挡' in skill
assert '保留' in skill
router=(ROOT/'references/visual-router.md').read_text(encoding='utf-8')
assert 'editorial-infographic.md' in router
assert 'editorial-data-graphic.md' in router
for path in ['references/editorial-infographic.md','references/editorial-data-graphic.md']:
    s=(ROOT/path).read_text(encoding='utf-8')
    assert '遮挡' in s, path

# Check that each module referenced by SKILL exists.
for name in set(re.findall(r'references/([\w-]+\.md)', skill)):
    assert (ROOT/'references'/name).is_file(), name
for name in set(re.findall(r'examples/([\w-]+\.md)', skill)):
    assert (ROOT/'examples'/name).is_file(), name

try:
    import yaml
except ImportError:
    print('PyYAML unavailable; YAML syntax checks skipped')
else:
    frontmatter=skill.split('---\n',2)[1]
    fm=yaml.safe_load(frontmatter)
    assert fm['name']=='economist-visual'
    agents=yaml.safe_load((ROOT/'agents/openai.yaml').read_text(encoding='utf-8'))
    assert agents['interface']['default_prompt']
    print('YAML syntax checks: OK')
print(f'Static checks passed. Checked {len(list(ROOT.rglob("*.md")))} markdown files.')
