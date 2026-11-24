from surimi.v1 import species_pb2 as _species_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class InitialHCRData(_message.Message):
    __slots__ = ("species", "initial_fishing_mortality", "initial_biomass", "default_biomass_limit", "default_biomass_base", "default_f_max")
    SPECIES_FIELD_NUMBER: _ClassVar[int]
    INITIAL_FISHING_MORTALITY_FIELD_NUMBER: _ClassVar[int]
    INITIAL_BIOMASS_FIELD_NUMBER: _ClassVar[int]
    DEFAULT_BIOMASS_LIMIT_FIELD_NUMBER: _ClassVar[int]
    DEFAULT_BIOMASS_BASE_FIELD_NUMBER: _ClassVar[int]
    DEFAULT_F_MAX_FIELD_NUMBER: _ClassVar[int]
    species: _species_pb2.Species
    initial_fishing_mortality: float
    initial_biomass: float
    default_biomass_limit: float
    default_biomass_base: float
    default_f_max: float
    def __init__(self, species: _Optional[_Union[_species_pb2.Species, _Mapping]] = ..., initial_fishing_mortality: _Optional[float] = ..., initial_biomass: _Optional[float] = ..., default_biomass_limit: _Optional[float] = ..., default_biomass_base: _Optional[float] = ..., default_f_max: _Optional[float] = ...) -> None: ...

class InitialHCRDataSummary(_message.Message):
    __slots__ = ("initial_hcr_data",)
    INITIAL_HCR_DATA_FIELD_NUMBER: _ClassVar[int]
    initial_hcr_data: _containers.RepeatedCompositeFieldContainer[InitialHCRData]
    def __init__(self, initial_hcr_data: _Optional[_Iterable[_Union[InitialHCRData, _Mapping]]] = ...) -> None: ...
