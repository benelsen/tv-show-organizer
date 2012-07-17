all: cs2js bin

cs2js: .FORCE
	coffee -cb organizer.coffee

bin: .FORCE
	echo '#!/usr/bin/env node' > tmp
	cat organizer.js >> tmp
	mv tmp organizer.js

install:
	npm install -g

.FORCE:


.DEFAULT: all
