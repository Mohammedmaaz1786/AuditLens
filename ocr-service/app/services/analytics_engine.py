"""
Advanced Analytics Engine for AuditLens
Provides spending pattern analysis, vendor performance metrics, and optimization recommendations
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from scipy import stats
from loguru import logger
import warnings
warnings.filterwarnings('ignore')


@dataclass
class SpendingTrend:
    """Data class for spending trend analysis"""
    period: str
    total_amount: float
    invoice_count: int
    average_amount: float
    trend_direction: str  # 'increasing', 'decreasing', 'stable'
    change_percentage: float


@dataclass
class VendorMetrics:
    """Data class for vendor performance metrics"""
    vendor_id: str
    vendor_name: str
    total_spent: float
    invoice_count: int
    average_invoice_amount: float
    payment_term_compliance_rate: float
    invoice_accuracy_rate: float
    risk_score: float
    risk_level: str  # 'low', 'medium', 'high'
    optimization_potential: float


@dataclass
class ProcessMetrics:
    """Data class for process optimization metrics"""
    average_processing_time: float
    approval_bottlenecks: List[Dict]
    error_rate: float
    automation_potential: float
    efficiency_score: float


@dataclass
class Recommendation:
    """Data class for optimization recommendations"""
    category: str
    priority: str  # 'high', 'medium', 'low'
    title: str
    description: str
    potential_savings: float
    implementation_effort: str  # 'low', 'medium', 'high'
    impact_score: float


class AnalyticsEngine:
    """
    Advanced analytics and recommendation engine for invoice processing
    """
    
    def __init__(self):
        """Initialize the analytics engine"""
        logger.info("AnalyticsEngine initialized")
        self.scaler = StandardScaler()
        
    def analyze_spending_patterns(
        self,
        invoices: List[Dict],
        period: str = 'monthly'
    ) -> Dict:
        """
        Analyze spending patterns over time
        
        Args:
            invoices: List of invoice dictionaries
            period: Analysis period ('daily', 'weekly', 'monthly', 'quarterly')
            
        Returns:
            Dictionary containing spending pattern analysis
        """
        try:
            if not invoices:
                return {
                    "status": "error",
                    "message": "No invoice data provided"
                }
            
            # Convert to DataFrame
            df = pd.DataFrame(invoices)
            
            # Ensure required columns exist
            if 'invoice_date' not in df.columns or 'total_amount' not in df.columns:
                return {
                    "status": "error",
                    "message": "Missing required fields: invoice_date, total_amount"
                }
            
            # Convert date column
            df['invoice_date'] = pd.to_datetime(df['invoice_date'])
            df['total_amount'] = pd.to_numeric(df['total_amount'], errors='coerce')
            
            # Group by period
            if period == 'daily':
                df['period'] = df['invoice_date'].dt.to_period('D')
            elif period == 'weekly':
                df['period'] = df['invoice_date'].dt.to_period('W')
            elif period == 'monthly':
                df['period'] = df['invoice_date'].dt.to_period('M')
            elif period == 'quarterly':
                df['period'] = df['invoice_date'].dt.to_period('Q')
            else:
                df['period'] = df['invoice_date'].dt.to_period('M')
            
            # Aggregate spending by period
            period_spending = df.groupby('period').agg({
                'total_amount': ['sum', 'count', 'mean', 'std']
            }).reset_index()
            
            period_spending.columns = ['period', 'total_amount', 'invoice_count', 'average_amount', 'std_dev']
            
            # Calculate trends
            trends = []
            for i in range(len(period_spending)):
                if i > 0:
                    prev_amount = period_spending.iloc[i-1]['total_amount']
                    curr_amount = period_spending.iloc[i]['total_amount']
                    change_pct = ((curr_amount - prev_amount) / prev_amount * 100) if prev_amount > 0 else 0
                    
                    if change_pct > 5:
                        direction = 'increasing'
                    elif change_pct < -5:
                        direction = 'decreasing'
                    else:
                        direction = 'stable'
                else:
                    change_pct = 0
                    direction = 'baseline'
                
                trends.append({
                    'period': str(period_spending.iloc[i]['period']),
                    'total_amount': float(period_spending.iloc[i]['total_amount']),
                    'invoice_count': int(period_spending.iloc[i]['invoice_count']),
                    'average_amount': float(period_spending.iloc[i]['average_amount']),
                    'trend_direction': direction,
                    'change_percentage': float(change_pct)
                })
            
            # Seasonal analysis
            if 'invoice_date' in df.columns:
                df['month'] = df['invoice_date'].dt.month
                seasonal_spending = df.groupby('month')['total_amount'].agg(['sum', 'mean', 'count']).to_dict('index')
            else:
                seasonal_spending = {}
            
            # Department-wise analysis
            if 'department' in df.columns:
                dept_spending = df.groupby('department').agg({
                    'total_amount': ['sum', 'mean', 'count']
                }).to_dict('index')
            else:
                dept_spending = {}
            
            # Category-based analysis
            if 'category' in df.columns:
                category_spending = df.groupby('category').agg({
                    'total_amount': ['sum', 'mean', 'count']
                }).to_dict('index')
            else:
                category_spending = {}
            
            # Statistical insights
            total_spending = float(df['total_amount'].sum())
            avg_invoice = float(df['total_amount'].mean())
            median_invoice = float(df['total_amount'].median())
            std_invoice = float(df['total_amount'].std())
            
            return {
                "status": "success",
                "trends": trends,
                "seasonal_patterns": seasonal_spending,
                "department_analysis": dept_spending,
                "category_analysis": category_spending,
                "summary": {
                    "total_spending": total_spending,
                    "average_invoice": avg_invoice,
                    "median_invoice": median_invoice,
                    "std_deviation": std_invoice,
                    "total_invoices": len(df),
                    "period_analyzed": period
                }
            }
            
        except Exception as e:
            logger.error(f"Error in spending pattern analysis: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def analyze_vendor_performance(
        self,
        invoices: List[Dict],
        vendors: List[Dict]
    ) -> Dict:
        """
        Analyze vendor performance metrics
        
        Args:
            invoices: List of invoice dictionaries
            vendors: List of vendor dictionaries
            
        Returns:
            Dictionary containing vendor performance analysis
        """
        try:
            if not invoices:
                return {
                    "status": "error",
                    "message": "No invoice data provided"
                }
            
            df = pd.DataFrame(invoices)
            vendor_df = pd.DataFrame(vendors) if vendors else pd.DataFrame()
            
            # Group by vendor
            vendor_metrics = []
            
            if 'vendor_id' in df.columns:
                for vendor_id in df['vendor_id'].unique():
                    vendor_invoices = df[df['vendor_id'] == vendor_id]
                    
                    # Get vendor name
                    vendor_name = "Unknown"
                    if not vendor_df.empty and 'id' in vendor_df.columns and 'name' in vendor_df.columns:
                        vendor_match = vendor_df[vendor_df['id'] == vendor_id]
                        if not vendor_match.empty:
                            vendor_name = vendor_match.iloc[0]['name']
                    
                    # Calculate metrics
                    total_spent = float(vendor_invoices['total_amount'].sum())
                    invoice_count = len(vendor_invoices)
                    avg_amount = float(vendor_invoices['total_amount'].mean())
                    
                    # Payment term compliance (if payment_status exists)
                    if 'payment_status' in vendor_invoices.columns:
                        on_time_payments = len(vendor_invoices[vendor_invoices['payment_status'] == 'paid'])
                        compliance_rate = (on_time_payments / invoice_count * 100) if invoice_count > 0 else 0
                    else:
                        compliance_rate = 100.0  # Default
                    
                    # Invoice accuracy (if fraud_risk_score exists)
                    if 'fraud_risk_score' in vendor_invoices.columns:
                        avg_risk = vendor_invoices['fraud_risk_score'].mean()
                        accuracy_rate = (1 - avg_risk) * 100
                    else:
                        accuracy_rate = 95.0  # Default
                    
                    # Risk assessment
                    risk_factors = []
                    if avg_amount > df['total_amount'].quantile(0.9):
                        risk_factors.append(0.3)  # High value invoices
                    if compliance_rate < 80:
                        risk_factors.append(0.4)  # Poor compliance
                    if accuracy_rate < 90:
                        risk_factors.append(0.3)  # Low accuracy
                    
                    risk_score = sum(risk_factors) if risk_factors else 0.1
                    risk_score = min(risk_score, 1.0)
                    
                    if risk_score > 0.7:
                        risk_level = 'high'
                    elif risk_score > 0.4:
                        risk_level = 'medium'
                    else:
                        risk_level = 'low'
                    
                    # Optimization potential
                    optimization_potential = 0
                    if total_spent > df['total_amount'].sum() * 0.1:  # Significant vendor
                        optimization_potential += 0.3
                    if invoice_count > 10:  # Frequent vendor
                        optimization_potential += 0.2
                    if avg_amount > df['total_amount'].median():  # High value
                        optimization_potential += 0.3
                    
                    vendor_metrics.append({
                        'vendor_id': vendor_id,
                        'vendor_name': vendor_name,
                        'total_spent': total_spent,
                        'invoice_count': invoice_count,
                        'average_invoice_amount': avg_amount,
                        'payment_term_compliance_rate': compliance_rate,
                        'invoice_accuracy_rate': accuracy_rate,
                        'risk_score': risk_score,
                        'risk_level': risk_level,
                        'optimization_potential': optimization_potential
                    })
            
            # Sort by total spent
            vendor_metrics.sort(key=lambda x: x['total_spent'], reverse=True)
            
            # Top vendors analysis
            top_vendors = vendor_metrics[:10] if len(vendor_metrics) > 10 else vendor_metrics
            
            # Vendor concentration analysis
            total_spending = sum(v['total_spent'] for v in vendor_metrics)
            top_5_spending = sum(v['total_spent'] for v in vendor_metrics[:5]) if len(vendor_metrics) >= 5 else total_spending
            concentration_ratio = (top_5_spending / total_spending * 100) if total_spending > 0 else 0
            
            return {
                "status": "success",
                "vendor_metrics": vendor_metrics,
                "top_vendors": top_vendors,
                "summary": {
                    "total_vendors": len(vendor_metrics),
                    "total_spending": total_spending,
                    "average_spending_per_vendor": total_spending / len(vendor_metrics) if vendor_metrics else 0,
                    "concentration_ratio": concentration_ratio,
                    "high_risk_vendors": len([v for v in vendor_metrics if v['risk_level'] == 'high']),
                    "vendors_with_optimization_potential": len([v for v in vendor_metrics if v['optimization_potential'] > 0.5])
                }
            }
            
        except Exception as e:
            logger.error(f"Error in vendor performance analysis: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def analyze_process_optimization(
        self,
        invoices: List[Dict],
        audit_logs: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Analyze process optimization opportunities
        
        Args:
            invoices: List of invoice dictionaries
            audit_logs: Optional list of audit log dictionaries
            
        Returns:
            Dictionary containing process optimization analysis
        """
        try:
            if not invoices:
                return {
                    "status": "error",
                    "message": "No invoice data provided"
                }
            
            df = pd.DataFrame(invoices)
            
            # Processing time analysis
            if 'created_at' in df.columns and 'updated_at' in df.columns:
                df['created_at'] = pd.to_datetime(df['created_at'])
                df['updated_at'] = pd.to_datetime(df['updated_at'])
                df['processing_time'] = (df['updated_at'] - df['created_at']).dt.total_seconds() / 3600  # hours
                
                avg_processing_time = float(df['processing_time'].mean())
                median_processing_time = float(df['processing_time'].median())
                slow_invoices = len(df[df['processing_time'] > df['processing_time'].quantile(0.9)])
            else:
                avg_processing_time = 0
                median_processing_time = 0
                slow_invoices = 0
            
            # Approval bottleneck identification
            bottlenecks = []
            if 'approval_status' in df.columns:
                pending_approvals = df[df['approval_status'] == 'pending']
                if len(pending_approvals) > 0:
                    # Group by department or category
                    if 'department' in pending_approvals.columns:
                        dept_bottlenecks = pending_approvals.groupby('department').size().to_dict()
                        for dept, count in dept_bottlenecks.items():
                            if count > 5:  # Threshold
                                bottlenecks.append({
                                    'type': 'department',
                                    'location': dept,
                                    'pending_count': int(count),
                                    'severity': 'high' if count > 10 else 'medium'
                                })
            
            # Error rate tracking
            if 'status' in df.columns:
                error_count = len(df[df['status'].str.contains('error|failed', case=False, na=False)])
                error_rate = (error_count / len(df) * 100) if len(df) > 0 else 0
            else:
                error_rate = 0
            
            # Automation opportunities
            automation_score = 0
            automation_opportunities = []
            
            # Check for repetitive patterns
            if 'vendor_id' in df.columns:
                vendor_counts = df['vendor_id'].value_counts()
                frequent_vendors = len(vendor_counts[vendor_counts > 10])
                if frequent_vendors > 0:
                    automation_score += 0.3
                    automation_opportunities.append({
                        'area': 'vendor_processing',
                        'description': f'{frequent_vendors} vendors with >10 invoices can be automated',
                        'potential_impact': 'high'
                    })
            
            # Check for standard amounts
            if 'total_amount' in df.columns:
                amount_std = df['total_amount'].std()
                amount_mean = df['total_amount'].mean()
                if amount_mean > 0 and amount_std / amount_mean < 0.5:
                    automation_score += 0.2
                    automation_opportunities.append({
                        'area': 'amount_validation',
                        'description': 'Standard invoice amounts detected - auto-approval possible',
                        'potential_impact': 'medium'
                    })
            
            # Check for recurring invoices
            if 'invoice_date' in df.columns and 'vendor_id' in df.columns:
                df['invoice_date'] = pd.to_datetime(df['invoice_date'])
                df['month'] = df['invoice_date'].dt.to_period('M')
                recurring = df.groupby(['vendor_id', 'month']).size()
                recurring_vendors = len(recurring[recurring > 1])
                if recurring_vendors > 5:
                    automation_score += 0.3
                    automation_opportunities.append({
                        'area': 'recurring_invoices',
                        'description': f'{recurring_vendors} recurring invoice patterns detected',
                        'potential_impact': 'high'
                    })
            
            automation_score = min(automation_score, 1.0)
            
            # Efficiency score calculation
            efficiency_factors = []
            if avg_processing_time > 0:
                time_efficiency = max(0, 1 - (avg_processing_time / 24))  # Normalize to 24 hours
                efficiency_factors.append(time_efficiency * 0.3)
            
            if error_rate >= 0:
                error_efficiency = max(0, 1 - (error_rate / 100))
                efficiency_factors.append(error_efficiency * 0.3)
            
            if len(bottlenecks) == 0:
                efficiency_factors.append(0.2)
            
            if automation_score > 0.5:
                efficiency_factors.append(0.2)
            
            efficiency_score = sum(efficiency_factors) if efficiency_factors else 0.5
            
            return {
                "status": "success",
                "processing_metrics": {
                    "average_processing_time_hours": avg_processing_time,
                    "median_processing_time_hours": median_processing_time,
                    "slow_processing_invoices": slow_invoices,
                    "error_rate_percentage": error_rate
                },
                "bottlenecks": bottlenecks,
                "automation": {
                    "automation_potential_score": automation_score,
                    "opportunities": automation_opportunities
                },
                "efficiency_score": efficiency_score,
                "recommendations": self._generate_process_recommendations(
                    avg_processing_time,
                    error_rate,
                    len(bottlenecks),
                    automation_score
                )
            }
            
        except Exception as e:
            logger.error(f"Error in process optimization analysis: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def generate_recommendations(
        self,
        spending_analysis: Dict,
        vendor_analysis: Dict,
        process_analysis: Dict
    ) -> List[Dict]:
        """
        Generate optimization recommendations based on all analyses
        
        Args:
            spending_analysis: Results from spending pattern analysis
            vendor_analysis: Results from vendor performance analysis
            process_analysis: Results from process optimization analysis
            
        Returns:
            List of recommendation dictionaries
        """
        recommendations = []
        
        try:
            # Vendor negotiation opportunities
            if vendor_analysis.get('status') == 'success':
                vendor_metrics = vendor_analysis.get('vendor_metrics', [])
                for vendor in vendor_metrics[:5]:  # Top 5 vendors
                    if vendor.get('optimization_potential', 0) > 0.5:
                        potential_savings = vendor.get('total_spent', 0) * 0.05  # 5% savings estimate
                        recommendations.append({
                            'category': 'vendor_negotiation',
                            'priority': 'high',
                            'title': f"Negotiate with {vendor.get('vendor_name', 'Unknown')}",
                            'description': f"High spend vendor (${vendor.get('total_spent', 0):.2f}) with optimization potential. Consider renegotiating terms for better rates.",
                            'potential_savings': potential_savings,
                            'implementation_effort': 'medium',
                            'impact_score': 0.8
                        })
            
            # Cost-saving identification
            if spending_analysis.get('status') == 'success':
                trends = spending_analysis.get('trends', [])
                if trends:
                    latest_trend = trends[-1]
                    if latest_trend.get('trend_direction') == 'increasing':
                        change_pct = latest_trend.get('change_percentage', 0)
                        if change_pct > 15:
                            recommendations.append({
                                'category': 'cost_savings',
                                'priority': 'high',
                                'title': 'Investigate Spending Increase',
                                'description': f"Spending increased by {change_pct:.1f}% in the latest period. Review for unexpected costs or opportunities to reduce.",
                                'potential_savings': latest_trend.get('total_amount', 0) * 0.1,
                                'implementation_effort': 'low',
                                'impact_score': 0.7
                            })
            
            # Process improvement recommendations
            if process_analysis.get('status') == 'success':
                error_rate = process_analysis.get('processing_metrics', {}).get('error_rate_percentage', 0)
                if error_rate > 5:
                    recommendations.append({
                        'category': 'process_improvement',
                        'priority': 'high',
                        'title': 'Reduce Invoice Processing Errors',
                        'description': f"Error rate is {error_rate:.1f}%. Implement validation checks and staff training to reduce errors.",
                        'potential_savings': 0,  # Indirect savings
                        'implementation_effort': 'medium',
                        'impact_score': 0.8
                    })
                
                automation_score = process_analysis.get('automation', {}).get('automation_potential_score', 0)
                if automation_score > 0.5:
                    recommendations.append({
                        'category': 'automation',
                        'priority': 'medium',
                        'title': 'Implement Invoice Automation',
                        'description': f"High automation potential detected (score: {automation_score:.2f}). Automate repetitive invoice processing tasks.",
                        'potential_savings': 10000,  # Estimate based on time savings
                        'implementation_effort': 'high',
                        'impact_score': 0.9
                    })
                
                bottlenecks = process_analysis.get('bottlenecks', [])
                if bottlenecks:
                    for bottleneck in bottlenecks:
                        recommendations.append({
                            'category': 'process_improvement',
                            'priority': 'high',
                            'title': f"Resolve {bottleneck.get('location')} Bottleneck",
                            'description': f"{bottleneck.get('pending_count')} invoices pending in {bottleneck.get('location')}. Streamline approval process.",
                            'potential_savings': 0,
                            'implementation_effort': 'low',
                            'impact_score': 0.7
                        })
            
            # Risk mitigation strategies
            if vendor_analysis.get('status') == 'success':
                high_risk_vendors = vendor_analysis.get('summary', {}).get('high_risk_vendors', 0)
                if high_risk_vendors > 0:
                    recommendations.append({
                        'category': 'risk_mitigation',
                        'priority': 'high',
                        'title': 'Review High-Risk Vendors',
                        'description': f"{high_risk_vendors} vendors identified as high risk. Conduct thorough review and implement additional controls.",
                        'potential_savings': 0,
                        'implementation_effort': 'medium',
                        'impact_score': 0.85
                    })
            
            # Sort recommendations by impact score
            recommendations.sort(key=lambda x: x.get('impact_score', 0), reverse=True)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")
            return []
    
    def _generate_process_recommendations(
        self,
        avg_processing_time: float,
        error_rate: float,
        bottleneck_count: int,
        automation_score: float
    ) -> List[str]:
        """Generate specific process improvement recommendations"""
        recommendations = []
        
        if avg_processing_time > 24:
            recommendations.append("Reduce average processing time by streamlining approval workflows")
        
        if error_rate > 5:
            recommendations.append("Implement additional validation checks to reduce error rate")
        
        if bottleneck_count > 0:
            recommendations.append(f"Address {bottleneck_count} identified approval bottlenecks")
        
        if automation_score > 0.5:
            recommendations.append("High automation potential - consider implementing RPA for repetitive tasks")
        
        return recommendations
    
    def perform_clustering_analysis(
        self,
        invoices: List[Dict],
        n_clusters: int = 5
    ) -> Dict:
        """
        Perform clustering analysis on invoices to identify segments
        
        Args:
            invoices: List of invoice dictionaries
            n_clusters: Number of clusters to create
            
        Returns:
            Dictionary containing clustering results
        """
        try:
            if not invoices or len(invoices) < n_clusters:
                return {
                    "status": "error",
                    "message": "Insufficient data for clustering analysis"
                }
            
            df = pd.DataFrame(invoices)
            
            # Select numerical features for clustering
            feature_columns = []
            if 'total_amount' in df.columns:
                feature_columns.append('total_amount')
            if 'line_items_count' in df.columns:
                feature_columns.append('line_items_count')
            if 'fraud_risk_score' in df.columns:
                feature_columns.append('fraud_risk_score')
            
            if not feature_columns:
                return {
                    "status": "error",
                    "message": "No numerical features available for clustering"
                }
            
            # Prepare features
            X = df[feature_columns].fillna(0)
            X_scaled = self.scaler.fit_transform(X)
            
            # Perform K-Means clustering
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            df['cluster'] = kmeans.fit_predict(X_scaled)
            
            # Analyze clusters
            cluster_profiles = []
            for i in range(n_clusters):
                cluster_data = df[df['cluster'] == i]
                profile = {
                    'cluster_id': i,
                    'size': len(cluster_data),
                    'percentage': len(cluster_data) / len(df) * 100,
                    'characteristics': {}
                }
                
                for col in feature_columns:
                    profile['characteristics'][col] = {
                        'mean': float(cluster_data[col].mean()),
                        'median': float(cluster_data[col].median()),
                        'std': float(cluster_data[col].std())
                    }
                
                cluster_profiles.append(profile)
            
            return {
                "status": "success",
                "n_clusters": n_clusters,
                "cluster_profiles": cluster_profiles,
                "features_used": feature_columns
            }
            
        except Exception as e:
            logger.error(f"Error in clustering analysis: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }
