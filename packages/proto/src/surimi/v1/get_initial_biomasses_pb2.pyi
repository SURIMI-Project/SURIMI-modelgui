from buf.validate import validate_pb2 as _validate_pb2
from surimi.v1 import species_pb2 as _species_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class GetInitialBiomassesRequest(_message.Message):
    __slots__ = ("scenario_name",)
    SCENARIO_NAME_FIELD_NUMBER: _ClassVar[int]
    scenario_name: str
    def __init__(self, scenario_name: _Optional[str] = ...) -> None: ...

class InitialBiomass(_message.Message):
    __slots__ = ("species", "biomass")
    SPECIES_FIELD_NUMBER: _ClassVar[int]
    BIOMASS_FIELD_NUMBER: _ClassVar[int]
    species: _species_pb2.Species
    biomass: float
    def __init__(self, species: _Optional[_Union[_species_pb2.Species, _Mapping]] = ..., biomass: _Optional[float] = ...) -> None: ...

class InitialBiomassSummary(_message.Message):
    __slots__ = ("initial_biomasses",)
    INITIAL_BIOMASSES_FIELD_NUMBER: _ClassVar[int]
    initial_biomasses: _containers.RepeatedCompositeFieldContainer[InitialBiomass]
    def __init__(self, initial_biomasses: _Optional[_Iterable[_Union[InitialBiomass, _Mapping]]] = ...) -> None: ...

class GetInitialBiomassesResponse(_message.Message):
    __slots__ = ("initial_biomass_summary",)
    INITIAL_BIOMASS_SUMMARY_FIELD_NUMBER: _ClassVar[int]
    initial_biomass_summary: InitialBiomassSummary
    def __init__(self, initial_biomass_summary: _Optional[_Union[InitialBiomassSummary, _Mapping]] = ...) -> None: ...
