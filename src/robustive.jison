%lex


%options case-insensitive

// Special states for recognizing aliases
%x ALIAS

%%

"robustive"\s+            { /* console.log('Got Robustness Diagram', yytext,'#'); */ return 'RD'; }
[\s]+                     /* skip all whitespace */
[\n]+                     return 'NL';

"---"                     return 'RELATED';
"-->["                    return 'CONDITIONAL';
"-->"                     return 'SEQUENCIAL';

"A["                      return 'ACTOR';
"B["                      return 'BOUNDARY';
"C["                      return 'CONTROLLER';
"E["                      return 'ENTITY';
"U["                      return 'USECASE';
"]("                      { this.pushState('ALIAS'); return 'TEXT_END_ALIAS_START'; }
"]"                       return 'TEXT_END';
")"                       return 'ALIAS_END';
[^\[\]]+                  return 'TEXT';
<ALIAS>[a-zA-Z0-9_]+      { this.popState(); return 'ALIAS'; }

/lex

%start start

%%

start
    : NL start
    | RD usecase { yy.setRootDoc($2); return $2; }
    ;

usecase
    : /* empty */ { console.log('★empty'); $$ = [] }
    | usecase line {
        if ($2 != 'nl') {
            console.log('★if [usecase]:', $1, ' [line]:', $2);
            $1.push($2);
            $$ = $1;
        } else {
            console.log('★else [usecase]:', $1, ' [line]:', $2);
        }
    }
    ;

line
	: scenario { 
        $$ = $1;
        console.log('★[line] is [scenario]:', $1);
    }
	| NL { $$='nl'; }
	;

scenario
    : object leftovers {
        /* 始まりが決まる*/
        console.log('★beginWith: object=',$1, 'leftovers=', $2);
        if ($1.relations) {
            $1.relations.push($2);
        } else {
            $1.relations = [$2];
        }
        // yy.beginWithActor($1.text);
        // yy.addRelationActorWithBoundary($1.text, $2.to.text);
        $$ = $1;
    }
    ;

leftovers
    : relation object {
        console.log('1 related with', $2);
        const relations1 = [{ ...$1, to: $2 }];
        $$ = relations1;
    }
    | relation object leftovers {
        console.log('3 related with', $2, $3);
        if ($2.type === 'entity') {
            const relation = [{ ...$1, to: $2 }].concat($3);
            $$ = relation;
        } else {
            if ($2.relations) {
                $2.relations.concat($3);
            } else {
                $2.relations = $3;
            }
            const relation = [{ ...$1, to: $2 }];
            $$ = relation;
        }
    }
    ;

relation
    : RELATED {
        $$ = { type: 'related' };
    }
    | SEQUENCIAL {
        $$ = { type: 'sequential' };
    }
    | CONDITIONAL TEXT TEXT_END {
        $$ = { type: 'conditional', condition: $2 };
    }
    ;

object
    : ACTOR TEXT TEXT_END {
        console.log(`★[object] is Actor labeled "${$2}".`);
        const object1 = { type: 'actor', text: $2 };
        $$ = object1;
    }
    | BOUNDARY TEXT TEXT_END {
        console.log(`★[object] is Boundary labeled "${$2}".`);
        const object2 = { type: 'boundary', text: $2 };
        $$ = object2;
    }
    | CONTROLLER TEXT TEXT_END_ALIAS_START ALIAS ALIAS_END {
        console.log(`★[object] is Controller labeled "${$2}" and has an alias "${$4}".`);
        const object3 = { type: 'controller', text: $2, alias: $4 };
        $$ = object3;
    }
    | ENTITY TEXT TEXT_END {
        console.log(`★[object] is Entity labeled "${$2}".`);
        const object4 = { type: 'entity', text: $2 };
        $$ = object4;
    }
    ;

%%