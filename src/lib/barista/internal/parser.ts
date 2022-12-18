/*

    Barista tokenizer.
    This is extremely pointless.
    Why am I making this?

    Also, all variables will be global since I'm lazy

    Anyway, here's what I'd imagine a Barista script would look like:

    @:import "requests"
    @:merge @,requests

    @:set "url","https://cdn.discordapp.com/attachments/..."
    @:set "names",$(Json:parse $(@:get url))

    fun daily:
        @:set "choice",$( Math:randint 0, calc(names.length + 1) )
        server:setName $( names:get choice )

    @:export daily,"everyday"
    
*/

enum TokenType {
    Block,      // BlockTokens define blocks of "code".
                // Children should consist of BlockTokens and CallTokens.
                //  
    Call,       // CallTokens define function calls.
                //
    Value,      // ValueTokens describe a value.
                // 
}

/*

    A value's type.

*/

enum ValueType {
    Null,       // null, void
    String,     // "string content", 'string content'
    Boolean,    // true, false
    Number,     // /[0-9]/    | parsed with parseInt()
    //Object,     // {any}    | raw text will be processed with JSON.parse
    //Array,      // [any]    | raw text will be processed with JSON.parse
    Statement,  // $(any)     | value will be a CallToken
    Logic,      // ?(any)     | logic processor
                //            | Value and Value or not Value
    Not,        // !(any)     | not
                //            | Value
    Ternary,    // tern(any)  | inline if-else
                //            | Value ? Value : Value
    Math,       // #(any)     | simple equation processor
                //            | Value Operator Value
    Abstract,   // Abstracts are used for setting the names of
                // parameters in functions.
    Reference   // Everything else. Value will be the raw text.
                // This is a generic for variables/values the
                // tokenizer is unable to process.
}

// Base

interface BaseToken {
    type:  TokenType
    value: any
}

interface Token extends BaseToken {
    children: BaseToken[]
}

interface ValueToken extends BaseToken {
    type:      TokenType.Value
    valueType: ValueType
}

// ValueTokens

export namespace ValueTokens {
    export interface Null extends ValueToken {
        valueType: ValueType.Null,
        value:     null
    }

    export interface StringValue extends ValueToken {
        valueType: ValueType.String,
        value:     string
    }

    export interface NumberValue extends ValueToken {
        valueType: ValueType.Number,
        value:     number
    }

    export interface BooleanValue extends ValueToken {
        valueType: ValueType.Boolean,
        value:     boolean
    }

    /*
    export interface ObjectValue extends ValueToken {
        valueType:ValueType.Object,
        value:{[key:string]:any}
    }

    export interface ArrayValue extends ValueToken {
        valueType:ValueType.Array,
        value:any[]
    }
    */
    
    export interface Statement extends ValueToken {
        valueType: ValueType.Statement,
        value:     Tokens.CallToken
    }

    export interface Reference extends ValueToken {
        valueType: ValueType.Reference,
        value:     string
    }

    export interface Ternary extends ValueToken {
        valueType: ValueType.Ternary,
        value:     [ValueToken,ValueToken,ValueToken]
    }

    // Logic

    export namespace Logic {
        export enum LogicOperator {
            AND,
            OR,
            EQUALS,
            LESSTHAN,
            GREATERTHAN,
            GREATERTHANOREQUALTO,
            LESSTHANOREQUALTO
        }

        export const SymbolMap:Map<string,LogicOperator> = new Map()
        
        SymbolMap
            .set( "and", LogicOperator.AND                  )
            .set( "or",  LogicOperator.OR                   )
            .set( "==",  LogicOperator.EQUALS               )
            .set( ">",   LogicOperator.GREATERTHAN          )
            .set( ">=",  LogicOperator.GREATERTHANOREQUALTO )
            .set( "<",   LogicOperator.LESSTHAN             )
            .set( "<=",  LogicOperator.LESSTHANOREQUALTO    )

        export interface LogicValue extends ValueToken {
            valueType: ValueType.Logic,
            value: {
                op:    LogicOperator,
                left:  ValueToken,
                right: ValueToken
            }
        }

        export interface NotValue extends ValueToken {
            valueType: ValueType.Not,
            value:     ValueToken
        }
    }

    // Math
    
    export namespace Math {
        export enum MathOperator {
            ADD,
            SUB,
            MUL,
            DIV,
            POW
        }

        export const SymbolMap:Map<string,MathOperator> = new Map()
        
        SymbolMap
            .set( "+", MathOperator.ADD )
            .set( "-", MathOperator.SUB )
            .set( "*", MathOperator.MUL )
            .set( "/", MathOperator.DIV )
            .set( "^", MathOperator.POW )

        export interface Math extends ValueToken {
            valueType:ValueType.Math
            value: {
                op:    MathOperator,
                left:  ValueToken,
                right: ValueToken
            }
        }
    }

    // Parsers

    export namespace Tokenizers {
    

        /*
            map of regexes for each valuetype
        */
        export let Regex:Map<ValueType,RegExp> = new Map()

        Regex
            .set( ValueType.Null,       /(null?)/                             )
            .set( ValueType.Boolean,    /(true?)|(false?)/                    )
            .set( ValueType.String,     /"(.+?)"|'(.+?)'/                     )
            .set( ValueType.Number,     /\d+/                                 )
            .set( ValueType.Statement,  /\$\((.+)\)/                          )
            .set( ValueType.Logic,      /\?\((.+)(and|or|==|>=|<=|<|>)(.+)\)/ )
            .set( ValueType.Math,       /#\((.+)(\+|\-|\*|\/|\^)(.+)\)/       )
            .set( ValueType.Ternary,    /tern\((.+)\?(.+)\:(.+)\)/            )
            .set( ValueType.Not,        /\!\((.+)\)/                          )

        export let Tokenizers:Map<ValueType, (unprocessedToken:string[])=>ValueToken> = new Map()

        Tokenizers
            .set(ValueType.Null,():Null => {return {type:TokenType.Value,valueType:ValueType.Null,value:null}})
            .set(ValueType.Boolean,(bool):BooleanValue => {return {type:TokenType.Value,valueType:ValueType.Boolean,value:bool[0]=="true"}})
            .set(ValueType.Not,(bool):Logic.NotValue => {return {type:TokenType.Value,valueType:ValueType.Not,value:getToken(bool[0])}})
            .set(ValueType.Number,(num):NumberValue => {return {type:TokenType.Value,valueType:ValueType.Number,value:parseFloat(num[0])}})
            .set(ValueType.String,(str):StringValue => {return {type:TokenType.Value,valueType:ValueType.String,value:str[0]}})
            .set(ValueType.Math,(values):Math.Math => {
                return {
                    type:      TokenType.Value,
                    valueType: ValueType.Math,
                    value:     {
                        left:  getToken(values[0]),
                        op:    Math.SymbolMap.get(values[1]) || Math.MathOperator.ADD,
                        right: getToken(values[2])
                    }
                }
            })
            .set(ValueType.Logic,(values):Logic.LogicValue => {
                return {
                    type:      TokenType.Value,
                    valueType: ValueType.Logic,
                    value:     {
                        left:  getToken(values[0]),
                        op:    Logic.SymbolMap.get(values[1]) || Logic.LogicOperator.EQUALS,
                        right: getToken(values[2])
                    }
                }
            })
            .set(ValueType.Ternary,(values):Ternary => {
                return {
                    type:      TokenType.Value,
                    valueType: ValueType.Ternary,
                    // maybe shrink to 
                    // values.map(e=>getToken(e))
                    value: [
                        getToken(values[0]),
                        getToken(values[1]),
                        getToken(values[2])
                    ]
                }
            })
            .set(ValueType.Statement,(values):Statement => {
                // As of writing, it is 23:16.
                // I'm too tired for this, so...
                //@ts-expect-error
                let ctg:(str:string) => Tokens.CallToken = Tokens.Tokenizers.get(TokenType.Call)
                return {type:TokenType.Value,valueType:ValueType.Statement,value:ctg(values[0])}
            })
        
        // There's probably a much more efficient way to do this,
        // I'm just too lazy to find it as of now
        export function getValueType(utS:string):ValueType {
            for (let [vtype,reg] of Regex.entries()) {
                if ((utS.match(reg) || [])[0]==utS) return vtype
            }
            
            return ValueType.Reference
        }

        export function getToken(utS:string):ValueToken {
            /*
                get tokenizer for value type, or return ValueTokens.Null
            */

            let valueType = getValueType(utS)
            let matched = utS.match(Regex.get(valueType) || /.+/) || []

            return (Tokenizers.get(valueType) || (():Null => {return {type:TokenType.Value,valueType:ValueType.Null,value:null}}))((matched.slice(1)))
        }

    }

    // there's probably a better way to do this...
    export namespace Typeguards {
        export let isNull      = (a:ValueToken): a is Null             => a.valueType == ValueType.Null
        export let isBoolean   = (a:ValueToken): a is BooleanValue     => a.valueType == ValueType.Boolean
        export let isNumber    = (a:ValueToken): a is NumberValue      => a.valueType == ValueType.Number
        export let isString    = (a:ValueToken): a is StringValue      => a.valueType == ValueType.String
        export let isNot       = (a:ValueToken): a is Logic.NotValue   => a.valueType == ValueType.Not
        export let isReference = (a:ValueToken): a is Reference        => a.valueType == ValueType.Reference
        export let isMath      = (a:ValueToken): a is Math.Math        => a.valueType == ValueType.Math
        export let isLogic     = (a:ValueToken): a is Logic.LogicValue => a.valueType == ValueType.Logic
        export let isTernary   = (a:ValueToken): a is Ternary          => a.valueType == ValueType.Ternary
        export let isStatement = (a:ValueToken): a is Statement        => a.valueType == ValueType.Statement
    }
}

// Tokens

export namespace Tokens {
    export let callTokenRegex = /(.+):(.+?) (.+)/

    export interface BlockToken extends Token {
        type: TokenType.Block
        value: string
        children: Token[]
    }

    export interface CallToken extends Token {
        type:     TokenType.Call
        value:    [ ValueTokens.Reference, string ],
        children: ValueToken[]
    }

    export let Tokenizers:Map<TokenType, (raw:string) => Token> = new Map()
    
    Tokenizers
        .set(TokenType.Call,(str):CallToken => {
            let match:string[] = str.match(callTokenRegex) || []
            
            let token = ValueTokens.Tokenizers.getToken(match[1])
            let refToken:ValueTokens.Reference

            if (ValueTokens.Typeguards.isReference(token)) refToken = token
            else refToken = {value:"@",valueType:ValueType.Reference,type:TokenType.Value}

            return {
                type: TokenType.Call,
                value: [ 
                    refToken,
                    match[2]
                ],
                // todo for split (2022-12-18): generate CallToken parameters
                children:[]
            }
        })

        export namespace Typeguards {
            export let isCall = (a:Token): a is CallToken => a.type == TokenType.Call
        }
}

export function parse() {

}