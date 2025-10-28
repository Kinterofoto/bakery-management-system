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
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: 2,
    borderBottomColor: '#14b8a6',
    paddingBottom: 15,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#14b8a6',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  infoGrid: {
    marginBottom: 20,
    backgroundColor: '#f9fafb',
    padding: 15,
    borderRadius: 5,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontFamily: 'Helvetica-Bold',
    width: 140,
    color: '#374151',
  },
  infoValue: {
    flex: 1,
    color: '#111827',
  },
  scoreCard: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 5,
    marginBottom: 15,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 11,
    color: '#92400e',
    marginBottom: 5,
  },
  scoreValue: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#14b8a6',
    marginTop: 20,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#d1d5db',
    paddingBottom: 5,
  },
  productCard: {
    marginBottom: 15,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#e5e7eb',
    borderRadius: 5,
    padding: 12,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#e5e7eb',
  },
  productName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  badge: {
    padding: '4 8',
    borderRadius: 3,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  badgeStock: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  badgeNoStock: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  badgeDisplayed: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  badgeNotDisplayed: {
    backgroundColor: '#fed7aa',
    color: '#9a3412',
  },
  scoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  scoreItem: {
    width: '33.33%',
    marginBottom: 8,
  },
  scoreItemLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 2,
  },
  scoreItemValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  scoreGood: { color: '#059669' },
  scoreWarning: { color: '#d97706' },
  scoreBad: { color: '#dc2626' },
  comments: {
    backgroundColor: '#fffbeb',
    padding: 8,
    borderRadius: 3,
    borderLeftWidth: 3,
    borderLeftStyle: 'solid',
    borderLeftColor: '#f59e0b',
    marginTop: 8,
  },
  commentsLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#78350f',
    marginBottom: 3,
  },
  commentsText: {
    fontSize: 9,
    color: '#451a03',
  },
  generalComments: {
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 5,
    marginTop: 15,
    borderLeftWidth: 3,
    borderLeftStyle: 'solid',
    borderLeftColor: '#2563eb',
  },
  statsCard: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 5,
    marginTop: 15,
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center',
  },
  statSubLabel: {
    fontSize: 7,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 2,
  },
  photoSection: {
    marginTop: 20,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 5,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#d1d5db',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: '#d1d5db',
    paddingTop: 10,
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center',
  },
})

interface VisitPDFProps {
  visit: any
  evaluations: any[]
  photos: any[]
  totalClientProducts: number
}

const getScoreColor = (score?: number) => {
  if (!score) return styles.scoreBad
  if (score >= 4) return styles.scoreGood
  if (score >= 3) return styles.scoreWarning
  return styles.scoreBad
}

export const VisitPDFDocument: React.FC<VisitPDFProps> = ({ visit, evaluations, photos, totalClientProducts }) => {
  const branchName = visit.branch?.name || visit.branch_name_custom || 'Sin especificar'
  const generalPhotos = photos.filter(p => p.photo_type === 'general')

  // Calculate product statistics based on total client products
  const productsWithStock = evaluations.filter(e => e.has_stock).length
  const productsDisplayed = evaluations.filter(e => e.has_stock && e.is_displayed).length
  const stockPercentage = totalClientProducts > 0 ? (productsWithStock / totalClientProducts) * 100 : 0
  const displayPercentage = totalClientProducts > 0 ? (productsDisplayed / totalClientProducts) * 100 : 0

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Reporte de Visita a Tienda</Text>
          <Text style={styles.subtitle}>{visit.client?.name}</Text>
        </View>

        {/* Score Card */}
        {visit.average_score && (
          <View style={styles.scoreCard}>
            <Text style={styles.scoreText}>Calificación Promedio</Text>
            <Text style={styles.scoreValue}>{visit.average_score.toFixed(1)} / 5.0</Text>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoGrid}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cliente:</Text>
            <Text style={styles.infoValue}>{visit.client?.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sucursal:</Text>
            <Text style={styles.infoValue}>{branchName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fecha de Visita:</Text>
            <Text style={styles.infoValue}>{formatDate(visit.visit_date)}</Text>
          </View>
          {visit.operator_name && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Operador de Tienda:</Text>
              <Text style={styles.infoValue}>{visit.operator_name}</Text>
            </View>
          )}
          {visit.operator_phone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Teléfono:</Text>
              <Text style={styles.infoValue}>{visit.operator_phone}</Text>
            </View>
          )}
        </View>

        {/* General Comments */}
        {visit.general_comments && (
          <View style={styles.generalComments}>
            <Text style={styles.commentsLabel}>COMENTARIOS GENERALES</Text>
            <Text style={styles.commentsText}>{visit.general_comments}</Text>
          </View>
        )}

        {/* Product Statistics */}
        <View style={styles.statsCard}>
          <Text style={[styles.commentsLabel, { marginBottom: 10 }]}>ESTADÍSTICAS DE PRODUCTOS</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#111827' }]}>{totalClientProducts}</Text>
              <Text style={styles.statLabel}>Productos</Text>
              <Text style={styles.statLabel}>del Cliente</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#059669' }]}>{stockPercentage.toFixed(0)}%</Text>
              <Text style={styles.statLabel}>Con Existencias</Text>
              <Text style={styles.statSubLabel}>({productsWithStock} de {totalClientProducts})</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#2563eb' }]}>{displayPercentage.toFixed(0)}%</Text>
              <Text style={styles.statLabel}>Exhibidos</Text>
              <Text style={styles.statSubLabel}>({productsDisplayed} de {totalClientProducts})</Text>
            </View>
          </View>
        </View>

        {/* Products Section */}
        <Text style={styles.sectionTitle}>Evaluación de Productos</Text>

        {evaluations.map((evaluation) => (
          <View key={evaluation.id} style={styles.productCard} wrap={false}>
            <View style={styles.productHeader}>
              <Text style={styles.productName}>{evaluation.product?.name}</Text>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                <Text style={[styles.badge, evaluation.has_stock ? styles.badgeStock : styles.badgeNoStock]}>
                  {evaluation.has_stock ? 'CON STOCK' : 'SIN STOCK'}
                </Text>
                {evaluation.has_stock && evaluation.is_displayed !== undefined && (
                  <Text style={[styles.badge, evaluation.is_displayed ? styles.badgeDisplayed : styles.badgeNotDisplayed]}>
                    {evaluation.is_displayed ? 'EXHIBIDO' : 'NO EXHIBIDO'}
                  </Text>
                )}
              </View>
            </View>

            {evaluation.has_stock && evaluation.is_displayed && (
              <View style={styles.scoresGrid}>
                {evaluation.score_baking && (
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreItemLabel}>Horneado</Text>
                    <Text style={[styles.scoreItemValue, getScoreColor(evaluation.score_baking)]}>
                      {evaluation.score_baking.toFixed(1)} / 5
                    </Text>
                  </View>
                )}
                {evaluation.score_display && (
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreItemLabel}>Exhibición</Text>
                    <Text style={[styles.scoreItemValue, getScoreColor(evaluation.score_display)]}>
                      {evaluation.score_display.toFixed(1)} / 5
                    </Text>
                  </View>
                )}
                {evaluation.score_presentation && (
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreItemLabel}>Presentación</Text>
                    <Text style={[styles.scoreItemValue, getScoreColor(evaluation.score_presentation)]}>
                      {evaluation.score_presentation.toFixed(1)} / 5
                    </Text>
                  </View>
                )}
                {evaluation.score_taste && (
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreItemLabel}>Sabor</Text>
                    <Text style={[styles.scoreItemValue, getScoreColor(evaluation.score_taste)]}>
                      {evaluation.score_taste.toFixed(1)} / 5
                    </Text>
                  </View>
                )}
                {evaluation.score_baking_params && (
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreItemLabel}>Parámetros Horneo</Text>
                    <Text style={[styles.scoreItemValue, getScoreColor(evaluation.score_baking_params)]}>
                      {evaluation.score_baking_params.toFixed(1)} / 5
                    </Text>
                  </View>
                )}
              </View>
            )}

            {evaluation.has_stock && (
              <>
                {evaluation.storage_temperature && (
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreItemLabel}>Temperatura Almacenamiento</Text>
                    <Text style={styles.scoreItemValue}>{evaluation.storage_temperature}°C</Text>
                  </View>
                )}
                {evaluation.score_staff_training && (
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreItemLabel}>Capacitación Personal</Text>
                    <Text style={[styles.scoreItemValue, getScoreColor(evaluation.score_staff_training)]}>
                      {evaluation.score_staff_training.toFixed(1)} / 5
                    </Text>
                  </View>
                )}
              </>
            )}

            {evaluation.comments && (
              <View style={styles.comments}>
                <Text style={styles.commentsLabel}>Comentarios</Text>
                <Text style={styles.commentsText}>{evaluation.comments}</Text>
              </View>
            )}
          </View>
        ))}

        {/* General Photos */}
        {generalPhotos.length > 0 && (
          <View style={styles.photoSection} wrap={false}>
            <Text style={styles.sectionTitle}>Fotografías Generales</Text>
            <View style={styles.photoGrid}>
              {generalPhotos.slice(0, 6).map((photo) => (
                <Image
                  key={photo.id}
                  src={photo.photo_url}
                  style={styles.photo}
                />
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Reporte generado el {formatDate(new Date().toISOString())} - PastryApp Visitas a Tiendas</Text>
        </View>
      </Page>
    </Document>
  )
}
