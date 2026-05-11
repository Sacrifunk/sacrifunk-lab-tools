import os, re

# `sacrifunk_vortex_v2` is intentionally excluded from this legacy pipeline.
# It now ships from `tools/vortex-v2/` as a Vite + TypeScript single-file build
# emitting directly to `docs/sacrifunk_vortex_v2.html`. The .jsx source is kept
# in this repo as the canonical theory reference; do NOT re-add it here unless
# you also remove the Vite build, or the two pipelines will fight for the same
# output filename.
TOOLS = [
    ("five_laws_tutorial.jsx", "Five Laws Tutorial", "Learn the fundamental laws of vortex mathematics through interactive lessons"),
    ("sacrifunk_scale_explorer.jsx", "Scale Explorer", "Browse and analyze Sacrifunk's original scales with vortex pattern mapping"),
    ("sacrifunk_vortex_explorer.jsx", "Vortex Explorer", "Explore N-node modular arithmetic cycles and digital root patterns"),
    # ("sacrifunk_vortex_v2.jsx", "Vortex Explorer V2", "..."),  # → tools/vortex-v2/ (Vite build)
    ("sacrifunk_freq_explorer.jsx", "Frequency Explorer", "Explore Just Intonation ratios, intervals, and harmonic relationships"),
    ("sacrifunk_freq_designer.jsx", "Frequency Designer", "Configure vibroacoustic hardware: RME, MiniDSP, Crown amp, transducers"),
    ("sacrifunk_cymatics_lab.jsx", "Cymatics Lab", "Generate Chladni cymatics patterns and visualize frequency-driven plate vibrations"),
    ("sacrifunk_app.jsx", "Sacrifunk App", "Complete integrated tool: scales, vortex patterns, tutorials, and frequencies"),
]

# The hub index page below still lists vortex_v2 because the file ships from
# the Vite build. We rebuild the hub from this static list:
HUB_TOOLS = TOOLS + [
    ("sacrifunk_vortex_v2.html", "Vortex Explorer V2", "Advanced vortex diagram with animated cycles and scale analysis · TypeScript / Vite build"),
]

HTML_TEMPLATE = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} — Sacrifunk Lab</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.9/babel.min.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <style>
    body {{ background: #0a0a0f; color: #e8e8f0; margin: 0; font-family: 'Inter', -apple-system, sans-serif; }}
    .lab-nav {{ background: rgba(10,10,15,0.95); border-bottom: 1px solid #2a2a3a; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; backdrop-filter: blur(10px); }}
    .lab-nav a {{ color: #d4a843; text-decoration: none; font-family: 'Jura', sans-serif; font-size: 14px; letter-spacing: 1px; }}
    .lab-nav a:hover {{ color: #e8c060; }}
    .lab-nav .brand {{ font-size: 18px; font-weight: 600; letter-spacing: 2px; }}
    #root {{ min-height: calc(100vh - 50px); }}
  </style>
  <link href="https://fonts.googleapis.com/css2?family=Jura:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
<body>
  <nav class="lab-nav">
    <a href="https://sacrifunk.com/the-lab/" class="brand">SACRIFUNK LAB</a>
    <div>
      <a href="index.html">All Tools</a>
      &nbsp;&nbsp;|&nbsp;&nbsp;
      <a href="https://sacrifunk.com">sacrifunk.com</a>
    </div>
  </nav>
  <div id="root"></div>
  <script type="text/babel" data-type="module">
{jsx_code}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(React.createElement({component_name}));
  </script>
</body>
</html>'''

for filename, title, desc in TOOLS:
    with open(filename, 'r') as f:
        jsx = f.read()
    
    # Remove the import statement (React is loaded via CDN)
    jsx = re.sub(r'import\s*\{[^}]+\}\s*from\s*["\']react["\'];?\n?', '', jsx)
    
    # Add React hook references for CDN usage
    hook_line = "const { useState, useMemo, useCallback, useRef, useEffect } = React;\n\n"
    jsx = hook_line + jsx
    
    # Remove export default — just keep the function
    jsx = jsx.replace('export default ', '')
    
    # Find component name
    match = re.search(r'function\s+(\w+)\s*\(', jsx)
    component_name = match.group(1) if match else "App"
    
    # Generate output filename
    out_name = filename.replace('.jsx', '.html')
    
    html = HTML_TEMPLATE.format(
        title=title,
        jsx_code=jsx,
        component_name=component_name
    )
    
    # Write to docs/ folder (GitHub Pages serves from docs/)
    os.makedirs('docs', exist_ok=True)
    with open(f'docs/{out_name.replace(".jsx.html", ".html")}', 'w') as f:
        f.write(html)
    
    print(f"✅ {out_name} → docs/{out_name} ({component_name})")

# Create index.html hub page
INDEX_HTML = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Lab — Sacrifunk Interactive Tools</title>
  <link href="https://fonts.googleapis.com/css2?family=Jura:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0a0f; color: #e8e8f0; font-family: 'Inter', -apple-system, sans-serif; }
    .header { text-align: center; padding: 60px 24px 40px; }
    .header h1 { font-family: 'Jura', sans-serif; font-size: 48px; font-weight: 300; letter-spacing: 4px; background: linear-gradient(135deg, #D4A843, #C9A227); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 16px; }
    .header p { color: #787888; font-size: 16px; max-width: 600px; margin: 0 auto; line-height: 1.7; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; padding: 0 48px 60px; max-width: 1200px; margin: 0 auto; }
    .card { background: #12121a; border: 1px solid #2a2a3a; border-radius: 12px; padding: 32px; transition: all 0.3s ease; cursor: pointer; text-decoration: none; display: block; }
    .card:hover { border-color: rgba(212, 168, 67, 0.3); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.3); }
    .card h2 { font-family: 'Jura', sans-serif; font-size: 20px; font-weight: 500; color: #D4A843; margin-bottom: 12px; letter-spacing: 1px; }
    .card p { color: #B8B8C8; font-size: 14px; line-height: 1.6; }
    .card .launch { display: inline-block; margin-top: 16px; color: #CC2244; font-family: 'Jura', sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
    .card:hover .launch { color: #E02850; }
    .back { text-align: center; padding: 0 0 40px; }
    .back a { color: #787888; text-decoration: none; font-size: 14px; }
    .back a:hover { color: #D4A843; }
  </style>
</head>
<body>
  <div class="header">
    <h1>THE LAB</h1>
    <p>Interactive tools exploring tuning science, vortex mathematics, and spectral acoustics. Built by Sacrifunk.</p>
  </div>
  <div class="grid">
'''

for filename, title, desc in HUB_TOOLS:
    # HUB_TOOLS mixes .jsx (legacy pipeline) and .html (Vite output) entries.
    html_file = filename.replace('.jsx', '.html') if filename.endswith('.jsx') else filename
    INDEX_HTML += f'''    <a href="{html_file}" class="card">
      <h2>{title}</h2>
      <p>{desc}</p>
      <span class="launch">Launch Tool →</span>
    </a>
'''

INDEX_HTML += '''  </div>
  <div class="back">
    <a href="https://sacrifunk.com">← Back to sacrifunk.com</a>
  </div>
</body>
</html>'''

with open('docs/index.html', 'w') as f:
    f.write(INDEX_HTML)
print("✅ docs/index.html (hub page)")

