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
","                       return 'AND';

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
    : objects leftovers {
        /* 始まりが決まる*/
        console.log('★beginWith: object=',$1, 'leftovers=', $2);
        if ($1.relations) {
            $1.relations = $1.relations.concat($2);
        } else {
            $1.relations = $2;
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
    : relation objects {
        console.log('1 related with', $2);
        if ($1.type === 'related') {
            if ($2.type !== 'boundary' && ((Array.isArray($2) && $2[0].type !== 'entity') || (!Array.isArray($2) && $2.type !== 'entity'))) {
                $1.violating = '"Related" can only be connected to Boundary or Entity.'
                yy.hasError = true;
            }
        } else if ($1.type === 'sequential') {
            if ($2.type !== 'boundary' && $2.type !== 'controller' && $2.type !== 'usecase') {
                $1.violating = '"Sequential" can only be connected to Boundary, Controller or Usecase.'
                yy.hasError = true;
            }
        } else if ($1.type === 'conditional') {
            if ($2.type !== 'boundary' && $2.type !== 'controller' && $2.type !== 'usecase') {
                $1.violating = '"Conditional" can only be connected to Boundary, Controller or Usecase.'
                yy.hasError = true;
            }
        }

        if (Array.isArray($2)) {
            const relations = $2.map(o => { return { ...$1, to: o } });
            $$ = relations;
        } else {
            const relation = { ...$1, to: $2 };
            $$ = [relation];
        }
    }
    | relation objects leftovers {
        console.log('3 related with', $2, $3);
        if (Array.isArray($2)) { /* [{ type: 'entity', ... }] */
            const relations = $2.map(o => { return { ...$1, to: o } }).concat($3);
            /* [
             *   { type: 'related', to: { type: 'entity', ... },
             *   { type: 'sequential', to: { type: 'controller', ... } <--- $3
             * ]
             */
            $$ = relations; 
        } else {
            if ($2.relations) {
                /*
                 *  { type: 'controller' , relations: [
                 *      { type: 'related' , to: { type: 'entity', ... },
                 *      { type: 'sequential', to: { type: 'controller', ... } <--- $3
                 *    ]
                 *  }
                 */
                $2.relations = $2.relations.concat($3);
            } else {
                /*
                 *  { type: 'controller' , relations: [
                 *      { type: 'sequential', to: { type: 'controller', ... } <--- $3
                 *    ]
                 *  }
                 */
                $2.relations = $3;
            }
            const relation = { ...$1, to: $2 };
            $$ = [relation];
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

objects
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
    | USECASE TEXT TEXT_END_ALIAS_START ALIAS ALIAS_END {
        console.log(`★[object] is Usecase labeled "${$2}" and has an alias "${$4}".`);
        yy.addObject('usecase', $2, $4);
        const object5 = { type: 'usecase', text: $2, alias: $4 };
        $$ = object5;
    }
    | ENTITY TEXT TEXT_END AND objects {
        if (Array.isArray($5) && $5[0].type !== 'entity') {
            $5[0].violating = '"And" can only be used if all objects are Entity.'
            yy.hasError = true;
        } else if (!Array.isArray($5) && $5.type !== 'entity') {
            $5.violating = '"And" can only be used if all objects are Entity.'
            yy.hasError = true;
        }
        console.log(`★[object] is Entity labeled "${$2}" and "${$5}".`);
        yy.addObject('entity', $2);
        const object6 = { type: 'entity', text: $2 };
        if (Array.isArray($5)){
            $5.unshift(object6)
            $$ = $5;
        } else {
            $$ = [object6, $5];
        }  
    }
    ;

alias
    : DOLLAR ALIAS {
        console.log(`★[alias] is "${$2}".`);
        $$ = $2;
    }
    ;
%%