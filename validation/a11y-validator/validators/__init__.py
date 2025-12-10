"""Accessibility validators for different baseline tests"""

from .images_validator import ImagesValidator
from .forms_validator import FormsValidator
from .links_validator import LinksValidator
from .structure_validator import StructureValidator

__all__ = [
    "ImagesValidator",
    "FormsValidator",
    "LinksValidator",
    "StructureValidator"
]
