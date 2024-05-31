%lex

%%

"stateDiagram"\s+   return 'SD';
"-->"               return '-->';
[\s]+               /* skip whitespace */
[\n]+               return 'NL';
(A|B|C|E|U)\[.+?\]        return 'idStatement';

/lex

%start start

%%

start
    : NL start
    | SD document
    ;

document
    : line
    | document line {
        if ($2 != 'nl') {
            /* console.log(' document: 1: ', $1, ' pushing 2: ', $2); */
            $1.push($2);
            $$ = $1;
        } else {
            $$ = [$2];
        }
    }
    ;

line
	: statement { $$ = $1 }
	| NL { $$='nl'; }
	;

statement
    : idStatement '-->' idStatement
      {
        console.log($1 + ' transitions to ' + $3);
      }
    ;
