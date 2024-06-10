%lex /* lexical grammar */


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
"$"                       { this.pushState('ALIAS'); return 'DOLLAR'; }
[^\[\]]+                  return 'TEXT';
<ALIAS>[a-zA-Z0-9_]+      { this.popState(); return 'ALIAS'; }

/lex

%start start 

%% /* language grammar */

start
    : NL start 
    | RD usecase { yy.setRootDoc($2); return $2; }
    ;

usecase
    : /* empty */ { 
        console.log('★empty');
        $$ = { basics: null, alternatives:[], hasError: false } 
    }
    | usecase line {
        if ($2 != 'nl') {
            console.log('★if [usecase]:', $1, ' [line]:', $2);
            $1.basics = $2;
            $1.hasError = yy.hasError;
            $$ = $1;
        } else {
            console.log('★else [usecase]:', $1, ' [line]:', $2);
        }
    }
    ;

line
	: scenario { 
        console.log('★[line] is [scenario]:', $1);
        $$ = $1;
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
        if ($1.type !== 'actor') {
            $1.violating = 'Only Actor comes first in the basic course.'
            yy.hasError = true;
        }
        yy.addObject($1.type, $1);
        $$ = $1;
    }
    ;

leftovers
    : relation object {
        console.log('1 related with', $2);
        const relations1 = { ...$1, to: $2 };
        $$ = relations1;
    }
    | relation object leftovers {
        console.log('3 related with', $2, $3);
        if ($2.type === 'entity') {
            const relation = [{ ...$1, to: $2 }].push($3);
            $$ = relation;
        } else {
            if ($2.relations) {
                $2.relations.push($3);
            } else {
                $2.relations = [$3];
            }
            const relation = { ...$1, to: $2 };
            $$ = relation;
            console.log('★★ $2:', $$);
        }
    }
    | alias leftovers {
        const mycon = yy.getObject('controller', $1)
        console.log('AAAAAAlias!!!', mycon, $2);
    }
    ;

relation
    : RELATED {
        console.log("★[relation] is Related.")
        $$ = { type: 'related' };
    }
    | SEQUENCIAL {
        console.log("★[relation] is Sequential.")
        $$ = { type: 'sequential' };
    }
    | CONDITIONAL TEXT TEXT_END {
        console.log("★[relation] is Conditional.")
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
        yy.addObject('boundary', $2);
        const object2 = { type: 'boundary', text: $2 };
        $$ = object2;
    }
    | CONTROLLER TEXT TEXT_END_ALIAS_START ALIAS ALIAS_END {
        console.log(`★[object] is Controller labeled "${$2}" and has an alias "${$4}".`);
        yy.addObject('controller', $2, $4);
        const object3 = { type: 'controller', text: $2, alias: $4 };
        $$ = object3;
    }
    | ENTITY TEXT TEXT_END {
        console.log(`★[object] is Entity labeled "${$2}".`);
        yy.addObject('entity', $2);
        const object4 = { type: 'entity', text: $2 };
        $$ = object4;
    }
    | USECASE TEXT TEXT_END {
        console.log(`★[object] is Usecase labeled "${$2}".`);
        yy.addObject('usecase', $2);
        const object5 = { type: 'usecase', text: $2 };
        $$ = object5;
    }
    ;

alias
    : DOLLAR ALIAS {
        console.log(`★[alias] is "${$2}".`);
        $$ = $2;
    }
    ;
%%
