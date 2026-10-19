import re, sys

def strip(s):
    s = re.sub(r"/\*.*?\*/", "", s, flags=re.S)      # block comments
    s = re.sub(r"//[^\n]*", "", s)                     # line comments
    s = re.sub(r"`(?:\\.|[^`\\])*`", '""', s, flags=re.S)  # template literals
    s = re.sub(r'"(?:\\.|[^"\\])*"', '""', s)          # double-quoted
    s = re.sub(r"'(?:\\.|[^'\\])*'", '""', s)          # single-quoted
    return s

for f in sys.argv[1:]:
    s = strip(open(f, encoding="utf-8").read())
    print(f, "paren", s.count("(") - s.count(")"),
          "bracket", s.count("[") - s.count("]"),
          "brace", s.count("{") - s.count("}"))
