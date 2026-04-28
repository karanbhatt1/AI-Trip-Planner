"""Pydantic models for itinerary generation and validation."""

from typing import List, Optional

from pydantic import BaseModel, Field


class Checkpoint(BaseModel):
    time: str = Field(description="The time of the activity")
    title: str = Field(description="A catchy title")
    description: str = Field(description="Detailed description")
    location: str = Field(description="Specific name of the place")
    notes: str = Field(description="Travel tips")


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