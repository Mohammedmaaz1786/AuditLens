"""
Visualization Engine for AuditLens Analytics
Creates charts, graphs, and exportable reports
"""

import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from io import BytesIO
import base64
from datetime import datetime
from loguru import logger


class VisualizationEngine:
    """
    Creates visualizations for analytics data
    """
    
    def __init__(self):
        """Initialize the visualization engine"""
        sns.set_style("whitegrid")
        sns.set_palette("husl")
        self.colors = {
            'primary': '#3b82f6',
            'success': '#10b981',
            'warning': '#f59e0b',
            'danger': '#ef4444',
            'info': '#06b6d4'
        }
        logger.info("VisualizationEngine initialized")
    
    def create_spending_trend_chart(
        self,
        trends: List[Dict],
        title: str = "Spending Trends Over Time"
    ) -> str:
        """
        Create a line chart showing spending trends
        
        Args:
            trends: List of trend dictionaries
            title: Chart title
            
        Returns:
            Base64 encoded image string
        """
        try:
            if not trends:
                return self._create_no_data_chart(title)
            
            # Extract data
            periods = [t['period'] for t in trends]
            amounts = [t['total_amount'] for t in trends]
            
            # Create figure
            fig, ax = plt.subplots(figsize=(12, 6))
            
            # Plot line
            ax.plot(periods, amounts, marker='o', linewidth=2, 
                   markersize=8, color=self.colors['primary'])
            
            # Fill area under line
            ax.fill_between(range(len(periods)), amounts, alpha=0.3, 
                           color=self.colors['primary'])
            
            # Customize
            ax.set_xlabel('Period', fontsize=12, fontweight='bold')
            ax.set_ylabel('Total Amount ($)', fontsize=12, fontweight='bold')
            ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
            ax.grid(True, alpha=0.3)
            
            # Rotate x-axis labels
            plt.xticks(rotation=45, ha='right')
            
            # Add value labels on points
            for i, (period, amount) in enumerate(zip(periods, amounts)):
                if i % max(1, len(periods) // 10) == 0:  # Show every nth label
                    ax.annotate(f'${amount:,.0f}', 
                              xy=(i, amount),
                              xytext=(0, 10),
                              textcoords='offset points',
                              ha='center',
                              fontsize=9)
            
            plt.tight_layout()
            
            # Convert to base64
            return self._fig_to_base64(fig)
            
        except Exception as e:
            logger.error(f"Error creating spending trend chart: {str(e)}")
            return ""
    
    def create_vendor_performance_chart(
        self,
        vendor_metrics: List[Dict],
        top_n: int = 10
    ) -> str:
        """
        Create a horizontal bar chart of top vendors by spending
        
        Args:
            vendor_metrics: List of vendor metric dictionaries
            top_n: Number of top vendors to show
            
        Returns:
            Base64 encoded image string
        """
        try:
            if not vendor_metrics:
                return self._create_no_data_chart("Vendor Performance")
            
            # Get top N vendors
            top_vendors = sorted(vendor_metrics, 
                               key=lambda x: x['total_spent'], 
                               reverse=True)[:top_n]
            
            vendors = [v['vendor_name'] for v in top_vendors]
            amounts = [v['total_spent'] for v in top_vendors]
            risk_levels = [v['risk_level'] for v in top_vendors]
            
            # Create color map based on risk
            colors = []
            for risk in risk_levels:
                if risk == 'high':
                    colors.append(self.colors['danger'])
                elif risk == 'medium':
                    colors.append(self.colors['warning'])
                else:
                    colors.append(self.colors['success'])
            
            # Create figure
            fig, ax = plt.subplots(figsize=(12, 8))
            
            # Create horizontal bar chart
            y_pos = np.arange(len(vendors))
            bars = ax.barh(y_pos, amounts, color=colors, alpha=0.8)
            
            # Customize
            ax.set_yticks(y_pos)
            ax.set_yticklabels(vendors)
            ax.invert_yaxis()  # Highest on top
            ax.set_xlabel('Total Spent ($)', fontsize=12, fontweight='bold')
            ax.set_title(f'Top {top_n} Vendors by Spending', 
                        fontsize=14, fontweight='bold', pad=20)
            ax.grid(True, alpha=0.3, axis='x')
            
            # Add value labels
            for i, (bar, amount) in enumerate(zip(bars, amounts)):
                width = bar.get_width()
                ax.text(width, bar.get_y() + bar.get_height()/2,
                       f'${amount:,.0f}',
                       ha='left', va='center', fontsize=9,
                       xytext=(5, 0), textcoords='offset points')
            
            # Add legend for risk levels
            from matplotlib.patches import Patch
            legend_elements = [
                Patch(facecolor=self.colors['danger'], label='High Risk', alpha=0.8),
                Patch(facecolor=self.colors['warning'], label='Medium Risk', alpha=0.8),
                Patch(facecolor=self.colors['success'], label='Low Risk', alpha=0.8)
            ]
            ax.legend(handles=legend_elements, loc='lower right')
            
            plt.tight_layout()
            
            return self._fig_to_base64(fig)
            
        except Exception as e:
            logger.error(f"Error creating vendor performance chart: {str(e)}")
            return ""
    
    def create_category_distribution_chart(
        self,
        category_data: Dict,
        title: str = "Spending by Category"
    ) -> str:
        """
        Create a pie chart showing spending distribution by category
        
        Args:
            category_data: Dictionary of category spending data
            title: Chart title
            
        Returns:
            Base64 encoded image string
        """
        try:
            if not category_data:
                return self._create_no_data_chart(title)
            
            # Extract data
            categories = list(category_data.keys())
            # Handle tuple values from groupby
            amounts = []
            for cat in categories:
                data = category_data[cat]
                if isinstance(data, dict):
                    amounts.append(data.get(('total_amount', 'sum'), 0))
                elif isinstance(data, tuple):
                    amounts.append(data[0] if len(data) > 0 else 0)
                else:
                    amounts.append(0)
            
            # Create figure
            fig, ax = plt.subplots(figsize=(10, 8))
            
            # Create pie chart
            wedges, texts, autotexts = ax.pie(amounts, labels=categories,
                                              autopct='%1.1f%%',
                                              startangle=90,
                                              colors=sns.color_palette("husl", len(categories)))
            
            # Customize text
            for text in texts:
                text.set_fontsize(10)
            for autotext in autotexts:
                autotext.set_color('white')
                autotext.set_fontweight('bold')
                autotext.set_fontsize(9)
            
            ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
            
            plt.tight_layout()
            
            return self._fig_to_base64(fig)
            
        except Exception as e:
            logger.error(f"Error creating category distribution chart: {str(e)}")
            return ""
    
    def create_seasonal_heatmap(
        self,
        seasonal_data: Dict,
        title: str = "Seasonal Spending Patterns"
    ) -> str:
        """
        Create a heatmap showing seasonal spending patterns
        
        Args:
            seasonal_data: Dictionary of monthly spending data
            title: Chart title
            
        Returns:
            Base64 encoded image string
        """
        try:
            if not seasonal_data:
                return self._create_no_data_chart(title)
            
            # Prepare data
            months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            
            # Extract spending for each month
            spending = []
            for i in range(1, 13):
                if i in seasonal_data:
                    data = seasonal_data[i]
                    if isinstance(data, dict):
                        spending.append(data.get('sum', 0))
                    elif isinstance(data, tuple):
                        spending.append(data[0] if len(data) > 0 else 0)
                    else:
                        spending.append(0)
                else:
                    spending.append(0)
            
            # Reshape for heatmap (1 row x 12 columns)
            data_matrix = np.array(spending).reshape(1, -1)
            
            # Create figure
            fig, ax = plt.subplots(figsize=(14, 3))
            
            # Create heatmap
            sns.heatmap(data_matrix, annot=True, fmt='.0f', 
                       cmap='YlOrRd', cbar_kws={'label': 'Total Amount ($)'},
                       xticklabels=months, yticklabels=['Spending'],
                       linewidths=0.5, ax=ax)
            
            ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
            
            plt.tight_layout()
            
            return self._fig_to_base64(fig)
            
        except Exception as e:
            logger.error(f"Error creating seasonal heatmap: {str(e)}")
            return ""
    
    def create_risk_distribution_chart(
        self,
        vendor_metrics: List[Dict]
    ) -> str:
        """
        Create a chart showing vendor risk distribution
        
        Args:
            vendor_metrics: List of vendor metric dictionaries
            
        Returns:
            Base64 encoded image string
        """
        try:
            if not vendor_metrics:
                return self._create_no_data_chart("Vendor Risk Distribution")
            
            # Count vendors by risk level
            risk_counts = {'low': 0, 'medium': 0, 'high': 0}
            for vendor in vendor_metrics:
                risk_level = vendor.get('risk_level', 'low')
                risk_counts[risk_level] += 1
            
            # Create figure
            fig, ax = plt.subplots(figsize=(10, 6))
            
            # Create bar chart
            risk_levels = list(risk_counts.keys())
            counts = list(risk_counts.values())
            colors = [self.colors['success'], self.colors['warning'], self.colors['danger']]
            
            bars = ax.bar(risk_levels, counts, color=colors, alpha=0.8, width=0.6)
            
            # Customize
            ax.set_xlabel('Risk Level', fontsize=12, fontweight='bold')
            ax.set_ylabel('Number of Vendors', fontsize=12, fontweight='bold')
            ax.set_title('Vendor Risk Distribution', fontsize=14, fontweight='bold', pad=20)
            ax.grid(True, alpha=0.3, axis='y')
            
            # Add value labels
            for bar, count in zip(bars, counts):
                height = bar.get_height()
                ax.text(bar.get_x() + bar.get_width()/2, height,
                       f'{int(count)}',
                       ha='center', va='bottom', fontsize=12, fontweight='bold')
            
            plt.tight_layout()
            
            return self._fig_to_base64(fig)
            
        except Exception as e:
            logger.error(f"Error creating risk distribution chart: {str(e)}")
            return ""
    
    def create_processing_metrics_chart(
        self,
        processing_metrics: Dict
    ) -> str:
        """
        Create a gauge/metric chart for processing performance
        
        Args:
            processing_metrics: Dictionary of processing metrics
            
        Returns:
            Base64 encoded image string
        """
        try:
            # Create figure with subplots
            fig, axes = plt.subplots(2, 2, figsize=(12, 10))
            fig.suptitle('Invoice Processing Metrics', fontsize=16, fontweight='bold')
            
            # Metric 1: Average Processing Time
            ax1 = axes[0, 0]
            avg_time = processing_metrics.get('average_processing_time_hours', 0)
            self._create_gauge(ax1, avg_time, 0, 48, 'Avg Processing Time (hrs)',
                             thresholds=[12, 24, 48])
            
            # Metric 2: Error Rate
            ax2 = axes[0, 1]
            error_rate = processing_metrics.get('error_rate_percentage', 0)
            self._create_gauge(ax2, error_rate, 0, 100, 'Error Rate (%)',
                             thresholds=[5, 10, 20])
            
            # Metric 3: Slow Processing Invoices
            ax3 = axes[1, 0]
            slow_count = processing_metrics.get('slow_processing_invoices', 0)
            ax3.text(0.5, 0.5, str(int(slow_count)), 
                    ha='center', va='center',
                    fontsize=48, fontweight='bold',
                    color=self.colors['warning'])
            ax3.text(0.5, 0.2, 'Slow Processing\nInvoices',
                    ha='center', va='center',
                    fontsize=12)
            ax3.axis('off')
            
            # Metric 4: Summary box
            ax4 = axes[1, 1]
            median_time = processing_metrics.get('median_processing_time_hours', 0)
            summary_text = f"Median Time: {median_time:.1f} hrs\n"
            summary_text += f"Error Rate: {error_rate:.1f}%\n"
            summary_text += f"Slow Invoices: {int(slow_count)}"
            
            ax4.text(0.5, 0.5, summary_text,
                    ha='center', va='center',
                    fontsize=14,
                    bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.3))
            ax4.axis('off')
            
            plt.tight_layout()
            
            return self._fig_to_base64(fig)
            
        except Exception as e:
            logger.error(f"Error creating processing metrics chart: {str(e)}")
            return ""
    
    def _create_gauge(self, ax, value, min_val, max_val, label, thresholds=None):
        """Helper method to create a gauge chart"""
        # Normalize value
        norm_value = (value - min_val) / (max_val - min_val) if max_val > min_val else 0
        norm_value = max(0, min(1, norm_value))
        
        # Determine color
        if thresholds:
            if value <= thresholds[0]:
                color = self.colors['success']
            elif value <= thresholds[1]:
                color = self.colors['warning']
            else:
                color = self.colors['danger']
        else:
            color = self.colors['primary']
        
        # Create circular gauge
        theta = np.linspace(0, np.pi, 100)
        r = 1
        
        # Background arc
        ax.plot(r * np.cos(theta), r * np.sin(theta), 
               linewidth=20, color='lightgray', alpha=0.3)
        
        # Value arc
        theta_value = np.linspace(0, np.pi * norm_value, 100)
        ax.plot(r * np.cos(theta_value), r * np.sin(theta_value),
               linewidth=20, color=color, alpha=0.8)
        
        # Add value text
        ax.text(0, -0.3, f'{value:.1f}',
               ha='center', va='center',
               fontsize=32, fontweight='bold')
        
        # Add label
        ax.text(0, -0.6, label,
               ha='center', va='center',
               fontsize=12)
        
        ax.set_xlim(-1.5, 1.5)
        ax.set_ylim(-1, 1.5)
        ax.axis('off')
    
    def _fig_to_base64(self, fig) -> str:
        """Convert matplotlib figure to base64 encoded string"""
        buffer = BytesIO()
        fig.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode('utf-8')
        plt.close(fig)
        return f"data:image/png;base64,{image_base64}"
    
    def _create_no_data_chart(self, title: str) -> str:
        """Create a placeholder chart when no data is available"""
        fig, ax = plt.subplots(figsize=(10, 6))
        ax.text(0.5, 0.5, 'No Data Available',
               ha='center', va='center',
               fontsize=24, color='gray')
        ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
        ax.axis('off')
        plt.tight_layout()
        return self._fig_to_base64(fig)
    
    def create_comprehensive_dashboard(
        self,
        spending_analysis: Dict,
        vendor_analysis: Dict,
        process_analysis: Dict
    ) -> Dict[str, str]:
        """
        Create a comprehensive set of visualizations for a dashboard
        
        Args:
            spending_analysis: Results from spending analysis
            vendor_analysis: Results from vendor analysis
            process_analysis: Results from process analysis
            
        Returns:
            Dictionary mapping chart names to base64 encoded images
        """
        charts = {}
        
        try:
            # Spending trend chart
            if spending_analysis.get('status') == 'success':
                trends = spending_analysis.get('trends', [])
                charts['spending_trend'] = self.create_spending_trend_chart(trends)
                
                # Seasonal heatmap
                seasonal_data = spending_analysis.get('seasonal_patterns', {})
                charts['seasonal_heatmap'] = self.create_seasonal_heatmap(seasonal_data)
                
                # Category distribution
                category_data = spending_analysis.get('category_analysis', {})
                charts['category_distribution'] = self.create_category_distribution_chart(category_data)
            
            # Vendor performance chart
            if vendor_analysis.get('status') == 'success':
                vendor_metrics = vendor_analysis.get('vendor_metrics', [])
                charts['vendor_performance'] = self.create_vendor_performance_chart(vendor_metrics)
                charts['risk_distribution'] = self.create_risk_distribution_chart(vendor_metrics)
            
            # Processing metrics
            if process_analysis.get('status') == 'success':
                processing_metrics = process_analysis.get('processing_metrics', {})
                charts['processing_metrics'] = self.create_processing_metrics_chart(processing_metrics)
            
            logger.info(f"Generated {len(charts)} dashboard charts")
            return charts
            
        except Exception as e:
            logger.error(f"Error creating comprehensive dashboard: {str(e)}")
            return {}
