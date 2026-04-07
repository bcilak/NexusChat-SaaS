import re
with open("static/widget.js", "r", encoding="utf-8") as f:
    js = f.read()

# Find all occurrences of innerHTML = <div ... </div> ; and replace with ` `
js = re.sub(r'(innerHTML\s*=\s*)(<div[\s\S]*?</div\s*>)\s*;', lambda match: f"{match.group(1)}`{match.group(2)}`;", js)

with open("static/widget.js", "w", encoding="utf-8") as f:
    f.write(js)
print("Finished!")
