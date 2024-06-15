%lex /* lexical grammar */


%options case-insensitive

// Special states for recognizing aliases
%x ALIAS

%%

"robustive"\s+            { return 'RD'; }
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
    | RD usecase { return $2; }
    ;

usecase
    : /* empty */ { 
        yy.console.log('★empty');
        $$ = { scenario: null, hasError: false } 
    }
    | usecase course {
        yy.console.log('★[usecase] is', $1, ', [course] is', $2);

        const addAlternativeCourse = (object, course) => {
            if (object.alias && course.alias && object.alias === course.alias) {
                object.relations = object.relations.concat(course.relations);
                return;
            }
            const next = object.relations.find(r => r.to.type !== 'entity');
            if (!next) return;
            addAlternativeCourse(next.to, course);
        };
    
        if ($1.scenario === null) {
            $1.scenario = $2;
        } else {
            addAlternativeCourse($1.scenario, $2);
        }
        $1.hasError = yy.hasError;
        $$ = $1;
    }
    ;

course
    : objects leftovers {
        /* 始まりが決まる */
        yy.console.log('★★★ begin with', $1, ', [leftovers] is', $2);
        if ($1.relations) {
            $1.relations = $1.relations.concat($2);
        } else {
            $1.relations = $2;
        }
        if ($1.type !== 'actor') {
            $1.violating = 'Only Actor comes first in the basic course.'
            yy.hasError = true;
        }
        // yy.addObject($1);
        $$ = $1;
    }
    | alias leftovers {
        /* 始まりが決まる */
        yy.console.log('☆☆☆ begin with [alias]', $1, ', [leftovers] is', $2);
        $$ = { alias: $1, relations: $2 };
    }
    ;

leftovers
    : relation objects {
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
        if (Array.isArray($2)) { /* when only [{ type: 'entity', ... }] */
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
        }
    }
    ;

relation
    : RELATED {
        yy.console.log("★[relation] is Related.")
        $$ = { type: 'related' };
    }
    | SEQUENCIAL {
        yy.console.log("★[relation] is Sequential.")
        $$ = { type: 'sequential' };
    }
    | CONDITIONAL TEXT TEXT_END {
        yy.console.log("★[relation] is Conditional.")
        $$ = { type: 'conditional', condition: $2 };
    }
    ;

objects
    : ACTOR TEXT TEXT_END {
        yy.console.log(`★[object] is Actor labeled "${$2}".`);
        const object1 = { type: 'actor', text: $2 };
        $$ = object1;
    }
    | BOUNDARY TEXT TEXT_END {
        yy.console.log(`★[object] is Boundary labeled "${$2}".`);
        const object2 = { type: 'boundary', text: $2 };
        $$ = object2;
    }
    | CONTROLLER TEXT TEXT_END_ALIAS_START ALIAS ALIAS_END {
        yy.console.log(`★[object] is Controller labeled "${$2}" and has an alias "${$4}".`);
        const object3 = { type: 'controller', text: $2, alias: $4 };
        $$ = object3;
    }
    | ENTITY TEXT TEXT_END {
        yy.console.log(`★[object] is Entity labeled "${$2}".`);
        const object4 = { type: 'entity', text: $2 };
        $$ = object4;
    }
    | USECASE TEXT TEXT_END_ALIAS_START ALIAS ALIAS_END {
        yy.console.log(`★[object] is Usecase labeled "${$2}" and has an alias "${$4}".`);
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
        yy.console.log(`★[object] is Entity labeled "${$2}" and "${$5}".`);
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
        yy.console.log(`★[alias] is "${$2}".`);
        $$ = $2;
    }
    ;
%%