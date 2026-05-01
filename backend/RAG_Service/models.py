"""Pydantic models for itinerary generation and validation."""

from typing import List, Optional

from pydantic import BaseModel, Field


class Activity(BaseModel):
    name: str = Field(description="Activity name (e.g., boating, rafting, paragliding)")
    description: str = Field(description="Activity details and what to expect")
    estimated_cost: str = Field(description="Approximate cost (e.g., '₹500-800', '₹1000-1500')")
    duration: str = Field(description="Activity duration (e.g., '2-3 hours', 'Full day')")
    notes: str = Field(description="Safety tips or special requirements")


class Cost(BaseModel):
    category: str = Field(description="Cost category (transport, accommodation, food, activities)")
    description: str = Field(description="Specific cost item")
    estimated_amount: str = Field(description="Estimated cost in rupees (e.g., '₹500', '₹2000-3000')")


class Checkpoint(BaseModel):
    time: str = Field(description="The time of the activity")
    title: str = Field(description="A catchy title")
    description: str = Field(description="Detailed description")
    location: str = Field(description="Specific name of the place")
    notes: str = Field(description="Travel tips")
    activities: Optional[List[Activity]] = Field(default=None, description="Activities available at this checkpoint")
    costs: Optional[List[Cost]] = Field(default=None, description="Associated costs for this checkpoint")


class DayPlan(BaseModel):
    dayNumber: int = Field(description="1-based day number")
    date: str = Field(description="ISO date for the day")
    title: str = Field(description="Day title")
    summary: str = Field(description="Short day summary")
    checkpoints: List[Checkpoint]


class ItinerarySummary(BaseModel):
    total_estimated_budget: str = Field(description="Estimated budget range")
    budget_fit: str = Field(description="How well the trip fits the budget")
    notes: str = Field(description="Additional planning notes")


class ItineraryMetadata(BaseModel):
    travelers: int = Field(description="Number of travelers")
    budget: str = Field(description="Budget preference")
    places: List[str] = Field(description="Planned destinations")
    interests: List[str] = Field(description="Traveler interests")
    specialRequirements: Optional[str] = Field(default="", description="Special requirements")
    currentLocation: Optional[str] = Field(default="", description="Starting location")
    currentDestination: Optional[str] = Field(default="", description="Primary destination")


class ItineraryPlan(BaseModel):
    metadata: ItineraryMetadata
    days: List[DayPlan]
    summary: ItinerarySummary