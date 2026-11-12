// import { flatDate, minMaxFromEnum } from "../../../src/libs/utils";
// import { VALIDATORS } from "../../libs/messages";
// import { Expiracao, IAditivo, Pessoa, IVencimento, ModalidadeAbatimento, ModalidadeDesconto, ModalidadeJurosDiasCorridos, ModalidadeJurosDiasUteis, ModalidadeMulta, ModalidadeAlteracao, IDesconto, IDescontoData } from "./models";
// import { Alteracao, Retirada, Valor as IValorCob } from "./models/cob";
// import { ICobVPutRequest, IValor as IValorCobV } from "./models/cobv";

// export interface ValidationErrorMessages {
//     type: string,
//     title: string,
//     detail: string
// }

// export const FIELDVALIDATION = {
//     txid: (name: string, v: string) => {
//         const schema =
//             VALIDATORS.required(name, v) ||
//             VALIDATORS.rangeLength(name, v, 26, 35) ||
//             VALIDATORS.pattern(name, v, /[a-zA-Z0-9]{26,35}/);

//         if (schema) {
//             return {
//                 propriedade: name,
//                 razao: `O campo ${name} não respeita o schema.`
//             }
//         }
//     },
//     chave: async (name: string, v: string, checkOwner: () => Promise<string | undefined>) => {

//         if (!!VALIDATORS.chaveDICT(name, v)) {
//             return {
//                 propriedade: name,
//                 razao: `O campo ${name} não respeita o schema.`
//             }
//         }

//         if (await checkOwner()) {
//             return {
//                 propriedade: name,
//                 razao: `O campo ${name} corresponde a uma conta que não pertence a este usuário recebedor.`
//             }
//         }
//     },

//     pessoa: (name: string, v: Pessoa) => {

//         if (v.cpf && v.cnpj) {
//             return {
//                 propriedade: name,
//                 razao: `ambos os parâmetros cpf e cnpj estão preenchidos.`
//             }
//         }
//         else if ((!v.cpf && !v.cnpj) || !v.nome) {
//             return {
//                 propriedade: name,
//                 razao: `O objeto ${name} não respeita o schema.`
//             }
//         }
//         else if (v.cpf && VALIDATORS.cpf(name, v.cpf)) {
//             return {
//                 propriedade: name,
//                 razao: `O objeto ${name} não respeita o schema.`
//             }
//         }
//         else if (v.cnpj && VALIDATORS.cnpj(name, v.cnpj)) {
//             return {
//                 propriedade: name,
//                 razao: `O objeto ${name} não respeita o schema.`
//             }
//         }
//     },

//     expiracao: (name: string, v: Expiracao) => {
//         const schema = VALIDATORS.greaterThan(name, v?.expiracao, 0);

//         if (schema) {
//             return {
//                 propriedade: name,
//                 razao: `O campo ${name}.calendario.expiracao é igual ou menor que zero.`
//             }
//         }
//     },

//     vencimento: (name: string, v: IVencimento, cobranca: Date) => {

//         if (VALIDATORS.greaterEqual(name, +new Date(v?.dataDeVencimento), +flatDate(cobranca))) {
//             return {
//                 propriedade: name,
//                 razao: `O campo ${name}.calendario.dataDeVencimento é anterior à data de criação da cobrança.`
//             }
//         }
//         else if (VALIDATORS.greaterEqual(name, v.validadeAposVencimento, 0)) {
//             return {
//                 propriedade: name,
//                 razao: `O campo ${name}.calendario.validadeAposVencimento é menor do que zero.`
//             }
//         }
//     },

//     retirada: async (name: string, v: Retirada) => {
//         if (v.retirada) {
//             throw new Error("NÃO IMPLEMENTADO.");
//         }
//     },

//     valor: (name: string, v: IValorCob | IValorCobV) => {

//         if (VALIDATORS.money(name, v.original)) {
//             return {
//                 propriedade: name,
//                 razao: `O campo ${name}.valor.original não respeita o schema.`
//             }
//         }
//         else if (VALIDATORS.greaterThan(name, Number.parseFloat(v.original), 0)) {
//             return {
//                 propriedade: name,
//                 razao: `O campo ${name}.valor.original é zero.`
//             }
//         }

//     },

//     multa: (name: string, v: IValorCobV) => {
//         if (v.multa) {
//             if (
//                 VALIDATORS.checkEnum(name, v.multa.modalidade, ModalidadeMulta) ||
//                 VALIDATORS.money(name, v.multa.valorPerc)

//             ) {
//                 return {
//                     propriedade: name,
//                     razao: `O campo ${name}.valor.multa não respeita o schema.`
//                 }
//             }
//         }
//     },

//     juros: (name: string, v: IValorCobV) => {
//         if (v.juros) {
//             if (
//                 (
//                     VALIDATORS.checkEnum(name, v.juros.modalidade, ModalidadeJurosDiasCorridos) &&
//                     VALIDATORS.checkEnum(name, v.juros.modalidade, ModalidadeJurosDiasUteis)
//                 ) ||
//                 VALIDATORS.money(name, v.juros.valorPerc)
//             ) {
//                 return {
//                     propriedade: name,
//                     razao: `O campo ${name}.valor.juros não respeita o schema.`
//                 }
//             }
//         }
//     },

//     abatimento: (name: string, v: IValorCobV) => {
//         if (v.abatimento) {
//             if (
//                 VALIDATORS.checkEnum(name, v.abatimento.modalidade, ModalidadeAbatimento) ||
//                 VALIDATORS.money(name, v.abatimento.valorPerc)
//             ) {
//                 return {
//                     propriedade: name,
//                     razao: `O campo ${name}.valor.abatimento não respeita o schema.`
//                 }
//             }
//             else if (
//                 (
//                     v.abatimento.modalidade === ModalidadeAbatimento.ValorFixo &&
//                     VALIDATORS.lessThan(name, Number.parseFloat(v.abatimento.valorPerc), Number.parseFloat(v.original))
//                 ) ||
//                 (
//                     v.abatimento.modalidade === ModalidadeAbatimento.Percentual &&
//                     VALIDATORS.lessThan(name, Number.parseFloat(v.abatimento.valorPerc), 100)
//                 )
//             ) {
//                 return {
//                     propriedade: name,
//                     razao: `O campo ${name}.valor.abatimento representa um valor maior ou igual ao valor da cobrança original ou maior ou igual a 100%.`
//                 }
//             }
//         }
//     },

//     // desconto: (name: string, v: ICobVPutRequest) => {
//     //     if (v.valor.desconto) {

//     //         if (VALIDATORS.checkEnum(name, v.valor.desconto.modalidade, ModalidadeDesconto)) {
//     //             return {
//     //                 propriedade: name,
//     //                 razao: `O campo ${name}.valor.desconto não respeita o schema.`
//     //             }
//     //         }

//     //         if (v.valor.desconto.modalidade <= 2) {
//     //             if ((v.valor.desconto.descontoDataFixa as IDescontoData[])?.find(f => Number.parseFloat(f.valorPerc) >= Number.parseFloat(v.valor.original))) {
//     //                 return {
//     //                     propriedade: name,
//     //                     razao: `O objeto ${name}.valor.desconto apresenta algum elemento de desconto que representa um valor maior ou igual ao valor da cobrança original ou maior ou igual a 100%.`
//     //                 }
//     //             }
//     //             else if ((v.valor.desconto.descontoDataFixa as IDescontoData[]).find(f => +new Date(f.data) >= +new Date(v.calendario.dataDeVencimento))) {
//     //                 return {
//     //                     propriedade: name,
//     //                     razao: `O objeto cobv.valor.desconto apresenta algum elemento cuja data seja posterior à data de vencimento representada por calendario.dataDeVencimento.`
//     //                 }
//     //             }
//     //             else if (!(v.valor.desconto.descontoDataFixa as IDescontoData)) {
//     //                 return {
//     //                     propriedade: name,
//     //                     razao: `O objeto ${name}.valor.desconto apresenta algum elemento de desconto que representa um valor maior ou igual ao valor da cobrança original ou maior ou igual a 100%.`

//     //                 }
//     //             }
//     //             else {
//     //                 if (+new Date((v.valor.desconto.descontoDataFixa as IDescontoData).data) >= +new Date(v.calendario.dataDeVencimento)) {
//     //                     return {
//     //                         propriedade: name,
//     //                         razao: `O objeto ${name}.valor.desconto apresenta algum elemento de desconto que representa um valor maior ou igual ao valor da cobrança original ou maior ou igual a 100%.`
//     //                     }
//     //                 }
//     //             }
//     //         }
//     //         else {

//     //             if (

//     //                 VALIDATORS.money(name, (v.valor.desconto.descontoDataFixa as IDescontoData).valorPerc)
//     //             ) {
//     //                 return {
//     //                     propriedade: name,
//     //                     razao: `O campo ${name}.valor.desconto não respeita o schema.`
//     //                 }
//     //             }
//     //             else if (
//     //                 (
//     //                     v.desconto.modalidade === Modalidadedesconto.ValorFixo &&
//     //                     VALIDATORS.lessThan(name, Number.parseFloat(v.desconto.valorPerc), Number.parseFloat(v.original))
//     //                 ) ||
//     //                 (
//     //                     v.desconto.modalidade === Modalidadedesconto.Percentual &&
//     //                     VALIDATORS.lessThan(name, Number.parseFloat(v.desconto.valorPerc), 100)
//     //                 )
//     //             ) {
//     //                 return {
//     //                     propriedade: name,
//     //                     razao: `O campo ${name}.valor.desconto representa um valor maior ou igual ao valor da cobrança original ou maior ou igual a 100%.`
//     //                 }
//     //             }
//     //         },

//     //         cobrancaVencimento: (name: string, v: IValorCobV) => {
//     //             const data: { v: IAditivo, enum: any }[] = [
//     //                 { v: v.multa, enum: ModalidadeMulta },
//     //                 { v: v.juros, enum: ModalidadeJurosDiasCorridos },
//     //                 { v: v.juros, enum: ModalidadeJurosDiasUteis },
//     //                 { v: v.abatimento, enum: ModalidadeAbatimento },
//     //                 ...v.desconto.descontoDataFixa.map((m: IAditivo & { data: string }) => ({ v: m, enum: ModalidadeDesconto }))
//     //             ].filter(f => !!f.v);

//     //             const schema =

//     //                 data.reduce((prev: IAditivo, curr: any) => prev ||
//     //                     !!VALIDATORS.checkEnum(name, curr.modalidade, curr.enum) ||
//     //                     !!VALIDATORS.money(name, curr.valorPerc) ||
//     //                     !!VALIDATORS.greaterThan(name, Number.parseFloat(curr.valorPerc), 0)
//     //                     , undefined);

//     //             if (schema) {
//     //                 return {
//     //                     propriedade: name,
//     //                     razao: `O campo ${name} não respeita o schema.`
//     //                 }
//     //             }
//     //         }
//     //     }
//     // }
// }
