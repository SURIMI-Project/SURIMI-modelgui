from buf.validate import validate_pb2 as _validate_pb2
from surimi.v1 import species_pb2 as _species_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class TargetFishingMortality(_message.Message):
    __slots__ = ("species", "biomass_limit", "biomass_base", "f_max")
    SPECIES_FIELD_NUMBER: _ClassVar[int]
    BIOMASS_LIMIT_FIELD_NUMBER: _ClassVar[int]
    BIOMASS_BASE_FIELD_NUMBER: _ClassVar[int]
    F_MAX_FIELD_NUMBER: _ClassVar[int]
    species: _species_pb2.Species
    biomass_limit: float
    biomass_base: float
    f_max: float
    def __init__(self, species: _Optional[_Union[_species_pb2.Species, _Mapping]] = ..., biomass_limit: _Optional[float] = ..., biomass_base: _Optional[float] = ..., f_max: _Optional[float] = ...) -> None: ...

class RegulationDefinitionsSummary(_message.Message):
    __slots__ = ("target_fishing_mortalities",)
    TARGET_FISHING_MORTALITIES_FIELD_NUMBER: _ClassVar[int]
    target_fishing_mortalities: _containers.RepeatedCompositeFieldContainer[TargetFishingMortality]
    def __init__(self, target_fishing_mortalities: _Optional[_Iterable[_Union[TargetFishingMortality, _Mapping]]] = ...) -> None: ...
