"""
Geographic Intelligence Agent for Austin location understanding.

This agent provides location context and search patterns for Austin-specific queries.
"""

from typing import Dict, List, Optional
from langchain.tools import tool
from pydantic import BaseModel, Field


class LocationContext(BaseModel):
    """Location context information for Austin queries."""
    location_name: str = Field(description="Original location mentioned by user")
    search_patterns: List[str] = Field(description="SQL LIKE patterns to search for this location")
    location_type: str = Field(description="Type of location (venue, neighborhood, district, etc.)")
    description: str = Field(description="Description and context about this Austin location")
    related_locations: List[str] = Field(description="Related locations user might be interested in")
    coordinates_hint: Optional[str] = Field(description="General coordinate range if known")


class AustinGeoIntelligence:
    """Austin geographic intelligence for ride-sharing data analysis."""
    
    def __init__(self):
        # Austin location database with comprehensive search patterns
        self.location_database = {
            # Major Venues & Landmarks
            "moody center": {
                "search_patterns": ["%Moody%", "%Moody Center%", "%Robert Dedman%"],
                "location_type": "venue",
                "description": "Moody Center - Major UT Austin venue and arena on Robert Dedman Drive",
                "related_locations": ["UT Campus", "West Campus", "University areas"],
                "coordinates_hint": "30.28, -97.73 (UT Campus area)"
            },
            "ut": {
                "search_patterns": ["%University%", "%Campus%", "%UT%", "%Texas%"],
                "location_type": "campus",
                "description": "University of Texas at Austin - Main campus and surrounding areas",
                "related_locations": ["West Campus", "The Drag", "Guadalupe Street"],
                "coordinates_hint": "30.28-30.29, -97.73-97.74"
            },
            "university of texas": {
                "search_patterns": ["%University%", "%Campus%", "%UT%", "%Texas%"],
                "location_type": "campus", 
                "description": "University of Texas at Austin - Main campus and surrounding areas",
                "related_locations": ["West Campus", "The Drag", "Guadalupe Street"],
                "coordinates_hint": "30.28-30.29, -97.73-97.74"
            },
            "state capitol": {
                "search_patterns": ["%Capitol%", "%State Capitol%", "%Congress Ave%"],
                "location_type": "government",
                "description": "Texas State Capitol - Downtown government complex",
                "related_locations": ["Downtown", "Congress Avenue", "Capitol Complex"],
                "coordinates_hint": "30.27, -97.74 (Downtown)"
            },
            "austin convention center": {
                "search_patterns": ["%Convention%", "%Convention Center%", "%ACC%"],
                "location_type": "venue",
                "description": "Austin Convention Center - Major downtown events venue",
                "related_locations": ["Downtown", "Lady Bird Lake", "2nd Street"],
                "coordinates_hint": "30.26, -97.74 (Downtown)"
            },
            "cota": {
                "search_patterns": ["%Circuit%", "%COTA%", "%Americas%", "%Racing%"],
                "location_type": "venue",
                "description": "Circuit of the Americas - Formula 1 racing venue in Southeast Austin",
                "related_locations": ["Southeast Austin", "Del Valle"],
                "coordinates_hint": "30.13, -97.64 (Southeast)"
            },
            
            # Entertainment Districts
            "6th street": {
                "search_patterns": ["%6th St%", "%East 6th%", "%West 6th%", "%Sixth St%"],
                "location_type": "entertainment_district",
                "description": "Historic 6th Street - Austin's main entertainment district with bars and live music",
                "related_locations": ["Downtown", "Red River District", "Rainey Street"],
                "coordinates_hint": "30.27, -97.74 (Downtown)"
            },
            "rainey street": {
                "search_patterns": ["%Rainey%", "%Rainey St%"],
                "location_type": "entertainment_district", 
                "description": "Rainey Street - Trendy bar district with converted house bars near downtown",
                "related_locations": ["Downtown", "6th Street", "Lady Bird Lake"],
                "coordinates_hint": "30.26, -97.74 (Downtown/Lady Bird Lake)"
            },
            "south congress": {
                "search_patterns": ["%South Congress%", "%S Congress%", "%SoCo%"],
                "location_type": "entertainment_district",
                "description": "South Congress (SoCo) - Iconic Austin shopping, dining, and music strip",
                "related_locations": ["South Austin", "Downtown", "Lady Bird Lake"],
                "coordinates_hint": "30.25-30.27, -97.75"
            },
            "the drag": {
                "search_patterns": ["%Guadalupe%", "%Drag%", "%Guad%"],
                "location_type": "street",
                "description": "The Drag (Guadalupe Street) - Main strip near UT campus with student businesses",
                "related_locations": ["UT Campus", "West Campus", "University area"],
                "coordinates_hint": "30.28-30.29, -97.74"
            },
            "east austin": {
                "search_patterns": ["%East Austin%", "%78702%"],
                "location_type": "neighborhood",
                "description": "East Austin - Hip, trendy neighborhood east of I-35 with food trucks and bars",
                "related_locations": ["Central East Austin", "East Cesar Chavez", "Red River District"],
                "coordinates_hint": "30.26-30.29, -97.71-97.73"
            },
            
            # Neighborhoods
            "west campus": {
                "search_patterns": ["%West Campus%", "%78705%"],
                "location_type": "neighborhood",
                "description": "West Campus - Student housing area west of UT campus",
                "related_locations": ["UT Campus", "The Drag", "University area"],
                "coordinates_hint": "30.28-30.29, -97.74-97.75"
            },
            "downtown": {
                "search_patterns": ["%Downtown%", "%78701%"],
                "location_type": "neighborhood", 
                "description": "Downtown Austin - Central business district with offices, hotels, and entertainment",
                "related_locations": ["6th Street", "Rainey Street", "Lady Bird Lake", "State Capitol"],
                "coordinates_hint": "30.26-30.27, -97.74-97.75"
            },
            "south austin": {
                "search_patterns": ["%South Austin%", "%78704%", "%78748%"],
                "location_type": "neighborhood",
                "description": "South Austin - 'Keep Austin Weird' area with eclectic culture and food scene",
                "related_locations": ["South Congress", "Barton Springs", "Zilker Park"],
                "coordinates_hint": "30.22-30.26, -97.74-97.78"
            },
            "north austin": {
                "search_patterns": ["%North Austin%", "%78751%", "%78756%"],
                "location_type": "neighborhood",
                "description": "North Austin - Residential areas north of the river with family neighborhoods",
                "related_locations": ["Hancock", "Hyde Park", "University Hills"],
                "coordinates_hint": "30.30-30.35, -97.72-97.76"
            },
            "tarrytown": {
                "search_patterns": ["%Tarrytown%", "%78703%"],
                "location_type": "neighborhood",
                "description": "Tarrytown - Upscale west side neighborhood with historic homes",
                "related_locations": ["West Austin", "Clarksville", "Scenic Drive"],
                "coordinates_hint": "30.27-30.30, -97.76-97.79"
            },
            
            # Additional specific locations
            "lady bird lake": {
                "search_patterns": ["%Lady Bird%", "%Town Lake%", "%Auditorium Shores%"],
                "location_type": "landmark",
                "description": "Lady Bird Lake - Central Austin lake with trails and recreational activities",
                "related_locations": ["Downtown", "South Austin", "Zilker Park"],
                "coordinates_hint": "30.26, -97.74 (Central Austin)"
            },
            "zilker park": {
                "search_patterns": ["%Zilker%", "%ACL%", "%Austin City Limits%"],
                "location_type": "park",
                "description": "Zilker Park - Major park hosting ACL Music Festival and other events",
                "related_locations": ["South Austin", "Barton Springs", "Lady Bird Lake"],
                "coordinates_hint": "30.26, -97.77 (South Central)"
            },
            "barton springs": {
                "search_patterns": ["%Barton Springs%", "%Barton%"],
                "location_type": "landmark",
                "description": "Barton Springs - Natural spring-fed pool and popular swimming spot",
                "related_locations": ["Zilker Park", "South Austin", "Lady Bird Lake"],
                "coordinates_hint": "30.26, -97.77"
            }
        }
    
    def get_location_context(self, user_query: str) -> Optional[LocationContext]:
        """
        Analyze user query and return location context if Austin location is detected.
        
        Args:
            user_query: User's query string
            
        Returns:
            LocationContext if location found, None otherwise
        """
        query_lower = user_query.lower()
        
        # Check for location matches
        for location_key, location_data in self.location_database.items():
            # Check if location name appears in query
            if location_key in query_lower:
                return LocationContext(
                    location_name=location_key.title(),
                    search_patterns=location_data["search_patterns"],
                    location_type=location_data["location_type"],
                    description=location_data["description"],
                    related_locations=location_data["related_locations"],
                    coordinates_hint=location_data.get("coordinates_hint")
                )
        
        # Check for partial matches or synonyms
        location_synonyms = {
            "university": "ut",
            "campus": "ut", 
            "sixth": "6th street",
            "soco": "south congress",
            "downtown": "downtown",
            "east side": "east austin"
        }
        
        for synonym, canonical in location_synonyms.items():
            if synonym in query_lower and canonical in self.location_database:
                location_data = self.location_database[canonical]
                return LocationContext(
                    location_name=canonical.title(),
                    search_patterns=location_data["search_patterns"],
                    location_type=location_data["location_type"], 
                    description=location_data["description"],
                    related_locations=location_data["related_locations"],
                    coordinates_hint=location_data.get("coordinates_hint")
                )
        
        return None
    
    def get_search_patterns_for_location(self, location_name: str) -> List[str]:
        """Get SQL search patterns for a specific location."""
        location_key = location_name.lower()
        if location_key in self.location_database:
            return self.location_database[location_key]["search_patterns"]
        return []
    
    def suggest_related_queries(self, location_name: str) -> List[str]:
        """Suggest related queries for a location."""
        location_key = location_name.lower()
        if location_key in self.location_database:
            related = self.location_database[location_key]["related_locations"]
            return [
                f"How many trips go to {loc}?" for loc in related[:2]
            ] + [
                f"Popular pickup spots near {loc}" for loc in related[:1]
            ]
        return []


# Create global instance
geo_intelligence = AustinGeoIntelligence()


@tool
def analyze_austin_location(query: str) -> str:
    """
    Analyze a user query to identify Austin locations and provide search guidance.
    
    Use this tool when a user mentions any Austin location, landmark, neighborhood, 
    or venue to get smart search patterns and context.
    
    Args:
        query: The user's query string
        
    Returns:
        Location analysis with search patterns and context, or indication if no location found
    """
    context = geo_intelligence.get_location_context(query)
    
    if not context:
        return "No specific Austin location detected in query. Proceed with general trip data analysis."
    
    # Format response for SQL agent (compact format)
    response = f"""LOCATION: {context.location_name} ({context.location_type})
PATTERNS: {', '.join(context.search_patterns[:2])}
RELATED: {', '.join(context.related_locations[:3])}
USE: WHERE pickup_address LIKE '{context.search_patterns[0]}' OR dropoff_address LIKE '{context.search_patterns[0]}'"""
    
    return response


@tool  
def get_austin_search_suggestions(location_name: str) -> str:
    """
    Get specific SQL search patterns for a known Austin location.
    
    Args:
        location_name: Name of the Austin location
        
    Returns:
        Formatted SQL search patterns
    """
    patterns = geo_intelligence.get_search_patterns_for_location(location_name)
    
    if not patterns:
        return f"No specific search patterns found for '{location_name}'. Try general Austin location search."
    
    return f"PATTERNS for {location_name}: {', '.join(patterns[:2])}"
