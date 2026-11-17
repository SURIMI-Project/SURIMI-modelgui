from buf.validate import validate_pb2 as _validate_pb2
from surimi.v1 import species_pb2 as _species_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class GetInitialFishingMortalitiesRequest(_message.Message):
    __slots__ = ("scenario_name",)
    SCENARIO_NAME_FIELD_NUMBER: _ClassVar[int]
    scenario_name: str
    def __init__(self, scenario_name: _Optional[str] = ...) -> None: ...

class InitialFishingMortality(_message.Message):
    __slots__ = ("species", "fishing_mortality")
    SPECIES_FIELD_NUMBER: _ClassVar[int]
    FISHING_MORTALITY_FIELD_NUMBER: _ClassVar[int]
    species: _species_pb2.Species
    fishing_mortality: float
    def __init__(self, species: _Optional[_Union[_species_pb2.Species, _Mapping]] = ..., fishing_mortality: _Optional[float] = ...) -> None: ...

class InitialFishingMortalitySummary(_message.Message):
    __slots__ = ("initial_fishing_mortalities",)
    INITIAL_FISHING_MORTALITIES_FIELD_NUMBER: _ClassVar[int]
    initial_fishing_mortalities: _containers.RepeatedCompositeFieldContainer[InitialFishingMortality]
    def __init__(self, initial_fishing_mortalities: _Optional[_Iterable[_Union[InitialFishingMortality, _Mapping]]] = ...) -> None: ...

class GetInitialFishingMortalitiesResponse(_message.Message):
    __slots__ = ("initial_fishing_mortality_summary",)
    INITIAL_FISHING_MORTALITY_SUMMARY_FIELD_NUMBER: _ClassVar[int]
    initial_fishing_mortality_summary: InitialFishingMortalitySummary
    def __init__(self, initial_fishing_mortality_summary: _Optional[_Union[InitialFishingMortalitySummary, _Mapping]] = ...) -> None: ...
