"""
Analytics API Endpoints for AuditLens
Provides endpoints for advanced analytics, recommendations, and visualizations
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from app.services.analytics_engine import AnalyticsEngine
from app.services.visualization_engine import VisualizationEngine
from loguru import logger

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

# Initialize engines
analytics_engine = AnalyticsEngine()
visualization_engine = VisualizationEngine()


class AnalyticsRequest(BaseModel):
    """Request model for analytics"""
    invoices: List[dict]
    vendors: Optional[List[dict]] = []
    audit_logs: Optional[List[dict]] = []
    period: Optional[str] = "monthly"


class RecommendationsResponse(BaseModel):
    """Response model for recommendations"""
    status: str
    recommendations: List[dict]
    total_potential_savings: float


@router.post("/spending-patterns")
async def analyze_spending_patterns(request: AnalyticsRequest):
    """
    Analyze spending patterns over time
    
    Returns trend analysis, seasonal patterns, and category breakdowns
    """
    try:
        logger.info(f"Analyzing spending patterns for {len(request.invoices)} invoices")
        
        result = analytics_engine.analyze_spending_patterns(
            invoices=request.invoices,
            period=request.period
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Error in spending pattern analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/vendor-performance")
async def analyze_vendor_performance(request: AnalyticsRequest):
    """
    Analyze vendor performance metrics
    
    Returns vendor rankings, risk assessments, and optimization opportunities
    """
    try:
        logger.info(f"Analyzing vendor performance for {len(request.invoices)} invoices")
        
        result = analytics_engine.analyze_vendor_performance(
            invoices=request.invoices,
            vendors=request.vendors
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Error in vendor performance analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/process-optimization")
async def analyze_process_optimization(request: AnalyticsRequest):
    """
    Analyze process optimization opportunities
    
    Returns processing metrics, bottlenecks, and automation potential
    """
    try:
        logger.info(f"Analyzing process optimization for {len(request.invoices)} invoices")
        
        result = analytics_engine.analyze_process_optimization(
            invoices=request.invoices,
            audit_logs=request.audit_logs
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Error in process optimization analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommendations")
async def generate_recommendations(request: AnalyticsRequest):
    """
    Generate optimization recommendations based on comprehensive analysis
    
    Returns prioritized recommendations with potential savings and implementation effort
    """
    try:
        logger.info("Generating optimization recommendations")
        
        # Perform all analyses
        spending_analysis = analytics_engine.analyze_spending_patterns(
            invoices=request.invoices,
            period=request.period
        )
        
        vendor_analysis = analytics_engine.analyze_vendor_performance(
            invoices=request.invoices,
            vendors=request.vendors
        )
        
        process_analysis = analytics_engine.analyze_process_optimization(
            invoices=request.invoices,
            audit_logs=request.audit_logs
        )
        
        # Generate recommendations
        recommendations = analytics_engine.generate_recommendations(
            spending_analysis=spending_analysis,
            vendor_analysis=vendor_analysis,
            process_analysis=process_analysis
        )
        
        # Calculate total potential savings
        total_savings = sum(r.get('potential_savings', 0) for r in recommendations)
        
        return JSONResponse(content={
            "status": "success",
            "recommendations": recommendations,
            "total_potential_savings": total_savings,
            "count": len(recommendations)
        })
        
    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clustering")
async def perform_clustering(
    request: AnalyticsRequest,
    n_clusters: int = Query(5, ge=2, le=10, description="Number of clusters")
):
    """
    Perform clustering analysis on invoices
    
    Returns invoice segments and cluster characteristics
    """
    try:
        logger.info(f"Performing clustering analysis with {n_clusters} clusters")
        
        result = analytics_engine.perform_clustering_analysis(
            invoices=request.invoices,
            n_clusters=n_clusters
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Error in clustering analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/visualizations/spending-trend")
async def create_spending_trend_visualization(request: AnalyticsRequest):
    """
    Create spending trend visualization
    
    Returns base64 encoded chart image
    """
    try:
        # Analyze spending
        analysis = analytics_engine.analyze_spending_patterns(
            invoices=request.invoices,
            period=request.period
        )
        
        if analysis.get('status') != 'success':
            raise HTTPException(status_code=400, detail="Analysis failed")
        
        # Create visualization
        chart = visualization_engine.create_spending_trend_chart(
            trends=analysis.get('trends', [])
        )
        
        return JSONResponse(content={
            "status": "success",
            "chart": chart,
            "chart_type": "spending_trend"
        })
        
    except Exception as e:
        logger.error(f"Error creating spending trend visualization: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/visualizations/vendor-performance")
async def create_vendor_performance_visualization(
    request: AnalyticsRequest,
    top_n: int = Query(10, ge=5, le=20, description="Number of top vendors to show")
):
    """
    Create vendor performance visualization
    
    Returns base64 encoded chart image
    """
    try:
        # Analyze vendors
        analysis = analytics_engine.analyze_vendor_performance(
            invoices=request.invoices,
            vendors=request.vendors
        )
        
        if analysis.get('status') != 'success':
            raise HTTPException(status_code=400, detail="Analysis failed")
        
        # Create visualization
        chart = visualization_engine.create_vendor_performance_chart(
            vendor_metrics=analysis.get('vendor_metrics', []),
            top_n=top_n
        )
        
        return JSONResponse(content={
            "status": "success",
            "chart": chart,
            "chart_type": "vendor_performance"
        })
        
    except Exception as e:
        logger.error(f"Error creating vendor performance visualization: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/visualizations/category-distribution")
async def create_category_distribution_visualization(request: AnalyticsRequest):
    """
    Create category distribution visualization
    
    Returns base64 encoded pie chart image
    """
    try:
        # Analyze spending
        analysis = analytics_engine.analyze_spending_patterns(
            invoices=request.invoices,
            period=request.period
        )
        
        if analysis.get('status') != 'success':
            raise HTTPException(status_code=400, detail="Analysis failed")
        
        # Create visualization
        chart = visualization_engine.create_category_distribution_chart(
            category_data=analysis.get('category_analysis', {})
        )
        
        return JSONResponse(content={
            "status": "success",
            "chart": chart,
            "chart_type": "category_distribution"
        })
        
    except Exception as e:
        logger.error(f"Error creating category distribution visualization: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/visualizations/seasonal-heatmap")
async def create_seasonal_heatmap_visualization(request: AnalyticsRequest):
    """
    Create seasonal spending heatmap
    
    Returns base64 encoded heatmap image
    """
    try:
        # Analyze spending
        analysis = analytics_engine.analyze_spending_patterns(
            invoices=request.invoices,
            period=request.period
        )
        
        if analysis.get('status') != 'success':
            raise HTTPException(status_code=400, detail="Analysis failed")
        
        # Create visualization
        chart = visualization_engine.create_seasonal_heatmap(
            seasonal_data=analysis.get('seasonal_patterns', {})
        )
        
        return JSONResponse(content={
            "status": "success",
            "chart": chart,
            "chart_type": "seasonal_heatmap"
        })
        
    except Exception as e:
        logger.error(f"Error creating seasonal heatmap: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/visualizations/risk-distribution")
async def create_risk_distribution_visualization(request: AnalyticsRequest):
    """
    Create vendor risk distribution visualization
    
    Returns base64 encoded chart image
    """
    try:
        # Analyze vendors
        analysis = analytics_engine.analyze_vendor_performance(
            invoices=request.invoices,
            vendors=request.vendors
        )
        
        if analysis.get('status') != 'success':
            raise HTTPException(status_code=400, detail="Analysis failed")
        
        # Create visualization
        chart = visualization_engine.create_risk_distribution_chart(
            vendor_metrics=analysis.get('vendor_metrics', [])
        )
        
        return JSONResponse(content={
            "status": "success",
            "chart": chart,
            "chart_type": "risk_distribution"
        })
        
    except Exception as e:
        logger.error(f"Error creating risk distribution visualization: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/visualizations/processing-metrics")
async def create_processing_metrics_visualization(request: AnalyticsRequest):
    """
    Create processing metrics visualization
    
    Returns base64 encoded chart image
    """
    try:
        # Analyze process
        analysis = analytics_engine.analyze_process_optimization(
            invoices=request.invoices,
            audit_logs=request.audit_logs
        )
        
        if analysis.get('status') != 'success':
            raise HTTPException(status_code=400, detail="Analysis failed")
        
        # Create visualization
        chart = visualization_engine.create_processing_metrics_chart(
            processing_metrics=analysis.get('processing_metrics', {})
        )
        
        return JSONResponse(content={
            "status": "success",
            "chart": chart,
            "chart_type": "processing_metrics"
        })
        
    except Exception as e:
        logger.error(f"Error creating processing metrics visualization: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/dashboard")
async def create_comprehensive_dashboard(request: AnalyticsRequest):
    """
    Create a comprehensive analytics dashboard with all visualizations
    
    Returns all charts in base64 format plus analysis summaries
    """
    try:
        logger.info("Creating comprehensive analytics dashboard")
        
        # Perform all analyses
        spending_analysis = analytics_engine.analyze_spending_patterns(
            invoices=request.invoices,
            period=request.period
        )
        
        vendor_analysis = analytics_engine.analyze_vendor_performance(
            invoices=request.invoices,
            vendors=request.vendors
        )
        
        process_analysis = analytics_engine.analyze_process_optimization(
            invoices=request.invoices,
            audit_logs=request.audit_logs
        )
        
        # Generate recommendations
        recommendations = analytics_engine.generate_recommendations(
            spending_analysis=spending_analysis,
            vendor_analysis=vendor_analysis,
            process_analysis=process_analysis
        )
        
        # Create all visualizations
        charts = visualization_engine.create_comprehensive_dashboard(
            spending_analysis=spending_analysis,
            vendor_analysis=vendor_analysis,
            process_analysis=process_analysis
        )
        
        # Calculate total potential savings
        total_savings = sum(r.get('potential_savings', 0) for r in recommendations)
        
        return JSONResponse(content={
            "status": "success",
            "charts": charts,
            "analyses": {
                "spending": spending_analysis,
                "vendors": vendor_analysis,
                "process": process_analysis
            },
            "recommendations": recommendations,
            "summary": {
                "total_potential_savings": total_savings,
                "total_invoices": len(request.invoices),
                "total_vendors": len(request.vendors),
                "recommendation_count": len(recommendations)
            }
        })
        
    except Exception as e:
        logger.error(f"Error creating comprehensive dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def analytics_health_check():
    """Health check endpoint for analytics service"""
    return {
        "status": "healthy",
        "service": "analytics",
        "timestamp": datetime.now().isoformat()
    }
