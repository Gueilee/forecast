'use client'

import { SlideBase } from '../SlideBase'
import type { SlideProps } from '../types'

export function SlideDisclaimer({ data }: SlideProps) {
  void data
  return (
    <SlideBase title="Declarações Prospectivas" contentBg="#ffffff">
      <div style={{ padding: '28px 48px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
        <div style={{
          border: '1.5px solid rgba(46,38,87,0.15)',
          borderRadius: '10px',
          padding: '28px 32px',
          background: '#faf9fd',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '4px', height: '32px', background: '#F23A5A', borderRadius: '2px', flexShrink: 0 }} />
            <h3 style={{ color: '#2E2657', fontSize: '14px', fontWeight: 700, margin: 0 }}>
              Aviso sobre Declarações Prospectivas
            </h3>
          </div>

          <p style={{ color: '#414042', fontSize: '11px', lineHeight: 1.75, margin: '0 0 14px' }}>
            Esta apresentação contém declarações prospectivas que refletem as expectativas atuais da administração da Vendemmia
            Comércio Internacional Ltda. sobre eventos futuros e resultados operacionais e financeiros. Essas declarações envolvem
            riscos conhecidos e desconhecidos, incertezas e outros fatores que podem fazer com que os resultados reais sejam
            materialmente diferentes das expectativas projetadas.
          </p>

          <p style={{ color: '#414042', fontSize: '11px', lineHeight: 1.75, margin: '0 0 14px' }}>
            Os dados e análises apresentados neste documento são baseados em informações disponíveis até a data de preparação
            desta apresentação e podem ser revisados conforme novas informações estejam disponíveis. Os resultados históricos
            não garantem resultados futuros.
          </p>

          <p style={{ color: '#414042', fontSize: '11px', lineHeight: 1.75, margin: 0 }}>
            As informações contidas nesta apresentação são de caráter confidencial e destinadas exclusivamente ao uso interno
            da Vendemmia Comércio Internacional Ltda. A divulgação, reprodução ou distribuição não autorizada é expressamente proibida.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <div style={{
            background: 'rgba(46,38,87,0.06)', borderRadius: '8px', padding: '8px 16px',
            color: '#2E2657', fontSize: '10px', fontWeight: 600,
          }}>
            Uso interno · Confidencial · Vendemmia {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </SlideBase>
  )
}
