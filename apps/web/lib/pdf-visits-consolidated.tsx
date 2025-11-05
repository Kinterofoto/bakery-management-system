import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 15,
    borderBottom: 2,
    borderBottomColor: '#14b8a6',
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#14b8a6',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 11,
    color: '#666',
  },
  summaryCard: {
    backgroundColor: '#f0fdfa',
    padding: 12,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#14b8a6',
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  summaryLabel: {
    fontFamily: 'Helvetica-Bold',
    width: 150,
    fontSize: 10,
  },
  summaryValue: {
    fontSize: 10,
    color: '#14b8a6',
    fontFamily: 'Helvetica-Bold',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#14b8a6',
    marginTop: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#d1d5db',
    paddingBottom: 4,
  },
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#14b8a6',
    padding: 6,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#fff',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottomWidth: 0.5,
    borderBottomStyle: 'solid',
    borderBottomColor: '#e5e7eb',
    fontSize: 8,
  },
  col1: { width: '15%' },
  col2: { width: '20%' },
  col3: { width: '15%' },
  col4: { width: '15%' },
  col5: { width: '10%', textAlign: 'center' },
  col6: { width: '25%' },
  scoresTable: {
    marginBottom: 15,
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 5,
  },
  scoresHeader: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    color: '#374151',
  },
  scoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  scoreBox: {
    width: '33.33%',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 7,
    color: '#6b7280',
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  scoreGood: { color: '#059669' },
  scoreWarning: { color: '#d97706' },
  scoreBad: { color: '#dc2626' },
  photoSection: {
    marginTop: 15,
  },
  photoHeader: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
    color: '#374151',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  photoItem: {
    width: 80,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 3,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#d1d5db',
    marginBottom: 3,
  },
  photoCaption: {
    fontSize: 6,
    color: '#6b7280',
    textAlign: 'center',
  },
  footer: {
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: '#d1d5db',
    paddingTop: 8,
    fontSize: 7,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 30,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 10,
    right: 30,
    fontSize: 7,
    color: '#9ca3af',
  },
})

interface ConsolidatedVisitsPDFProps {
  visits: any[]
  clientName?: string
  dateRange?: string
}

const getScoreColor = (score?: number) => {
  if (!score) return styles.scoreBad
  if (score >= 4) return styles.scoreGood
  if (score >= 3) return styles.scoreWarning
  return styles.scoreBad
}

export const ConsolidatedVisitsPDFDocument: React.FC<ConsolidatedVisitsPDFProps> = ({
  visits,
  clientName,
  dateRange
}) => {
  // Calculate averages
  const totalVisits = visits.length
  const avgScore = visits.reduce((sum, v) => sum + (v.average_score || 0), 0) / totalVisits

  // Get all evaluations with details
  const allEvaluations: any[] = []
  visits.forEach(visit => {
    if (visit.evaluations) {
      visit.evaluations.forEach((evaluation: any) => {
        allEvaluations.push({
          ...evaluation,
          visit_date: visit.visit_date,
          branch_name: visit.branch?.name || visit.branch_name_custom,
          operator_name: visit.operator_name
        })
      })
    }
  })

  // Calculate average scores by category
  const avgBaking = allEvaluations.filter(e => e.score_baking).reduce((sum, e) => sum + e.score_baking, 0) /
                    allEvaluations.filter(e => e.score_baking).length || 0
  const avgDisplay = allEvaluations.filter(e => e.score_display).reduce((sum, e) => sum + e.score_display, 0) /
                     allEvaluations.filter(e => e.score_display).length || 0
  const avgPresentation = allEvaluations.filter(e => e.score_presentation).reduce((sum, e) => sum + e.score_presentation, 0) /
                          allEvaluations.filter(e => e.score_presentation).length || 0
  const avgTraining = allEvaluations.filter(e => e.score_staff_training).reduce((sum, e) => sum + e.score_staff_training, 0) /
                      allEvaluations.filter(e => e.score_staff_training).length || 0
  const avgBakingParams = allEvaluations.filter(e => e.score_baking_params).reduce((sum, e) => sum + e.score_baking_params, 0) /
                          allEvaluations.filter(e => e.score_baking_params).length || 0

  // Calculate product statistics across all visits
  // Sum total client products across all visits
  const totalClientProducts = visits.reduce((sum, v) => sum + (v.totalClientProducts || 0), 0)
  const productsWithStock = allEvaluations.filter(e => e.has_stock).length
  const productsDisplayed = allEvaluations.filter(e => e.has_stock && e.is_displayed).length
  const stockPercentage = totalClientProducts > 0 ? (productsWithStock / totalClientProducts) * 100 : 0
  const displayPercentage = totalClientProducts > 0 ? (productsDisplayed / totalClientProducts) * 100 : 0

  // Collect all photos with metadata
  const allPhotos: any[] = []
  visits.forEach(visit => {
    if (visit.photos) {
      visit.photos.forEach((photo: any) => {
        allPhotos.push({
          ...photo,
          branch_name: visit.branch?.name || visit.branch_name_custom,
          visit_date: visit.visit_date
        })
      })
    }
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <Text style={styles.title}>Informe Consolidado de Visitas</Text>
          <Text style={styles.subtitle}>
            {clientName || 'Todas las visitas'} {dateRange && `- ${dateRange}`}
          </Text>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total de Visitas:</Text>
            <Text style={styles.summaryValue}>{totalVisits}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Calificación Promedio:</Text>
            <Text style={styles.summaryValue}>{avgScore.toFixed(2)} / 5.0</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Productos Cliente:</Text>
            <Text style={styles.summaryValue}>{totalClientProducts}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>% Con Existencias:</Text>
            <Text style={[styles.summaryValue, { color: '#059669' }]}>{stockPercentage.toFixed(1)}% ({productsWithStock}/{totalClientProducts})</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>% Exhibidos:</Text>
            <Text style={[styles.summaryValue, { color: '#2563eb' }]}>{displayPercentage.toFixed(1)}% ({productsDisplayed}/{totalClientProducts})</Text>
          </View>
        </View>

        {/* Average Scores */}
        <View style={styles.scoresTable}>
          <Text style={styles.scoresHeader}>Promedios por Categoría</Text>
          <View style={styles.scoresGrid}>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>Horneado</Text>
              <Text style={[styles.scoreValue, getScoreColor(avgBaking)]}>
                {avgBaking.toFixed(2)} / 5
              </Text>
            </View>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>Exhibición</Text>
              <Text style={[styles.scoreValue, getScoreColor(avgDisplay)]}>
                {avgDisplay.toFixed(2)} / 5
              </Text>
            </View>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>Presentación</Text>
              <Text style={[styles.scoreValue, getScoreColor(avgPresentation)]}>
                {avgPresentation.toFixed(2)} / 5
              </Text>
            </View>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>Capacitación</Text>
              <Text style={[styles.scoreValue, getScoreColor(avgTraining)]}>
                {avgTraining.toFixed(2)} / 5
              </Text>
            </View>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>Parámetros Horneo</Text>
              <Text style={[styles.scoreValue, getScoreColor(avgBakingParams)]}>
                {avgBakingParams.toFixed(2)} / 5
              </Text>
            </View>
          </View>
        </View>

        {/* Visits Table */}
        <Text style={styles.sectionTitle}>Detalle de Visitas</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Fecha</Text>
            <Text style={styles.col2}>Sucursal</Text>
            <Text style={styles.col3}>Operador</Text>
            <Text style={styles.col4}>Teléfono</Text>
            <Text style={styles.col5}>Score</Text>
            <Text style={styles.col6}>Comentarios</Text>
          </View>
          {visits.map((visit) => (
            <View key={visit.id} style={styles.tableRow} wrap={false}>
              <Text style={styles.col1}>{formatDate(visit.visit_date)}</Text>
              <Text style={styles.col2}>{visit.branch?.name || visit.branch_name_custom || 'N/A'}</Text>
              <Text style={styles.col3}>{visit.operator_name || 'N/A'}</Text>
              <Text style={styles.col4}>{visit.operator_phone || 'N/A'}</Text>
              <Text style={styles.col5}>{visit.average_score?.toFixed(1) || 'N/A'}</Text>
              <Text style={styles.col6}>{visit.general_comments?.substring(0, 50) || '-'}</Text>
            </View>
          ))}
        </View>

        {/* Photos Annex - Each visit on new page if needed */}
        {allPhotos.length > 0 && (
          <>
            <Text style={styles.sectionTitle} break>Anexo Fotográfico</Text>
            {visits.map((visit) => {
              const visitPhotos = allPhotos.filter(p =>
                p.visit_date === visit.visit_date &&
                (p.branch_name === visit.branch?.name || p.branch_name === visit.branch_name_custom)
              )

              if (visitPhotos.length === 0) return null

              return (
                <View key={visit.id} style={{ marginBottom: 15 }} wrap={false}>
                  <Text style={styles.photoHeader}>
                    {visit.branch?.name || visit.branch_name_custom} - {formatDate(visit.visit_date)}
                  </Text>
                  <View style={styles.photoGrid}>
                    {visitPhotos.slice(0, 6).map((photo, idx) => (
                      <View key={idx} style={styles.photoItem}>
                        <Image src={photo.photo_url} style={styles.photo} />
                        <Text style={styles.photoCaption}>
                          {photo.photo_type === 'general' ? 'General' : 'Producto'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )
            })}
          </>
        )}

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  )
}
